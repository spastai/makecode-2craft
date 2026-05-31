namespace SpriteKind {
    export const Monster = SpriteKind.create()
}

enum TileType {
    Empty,
    Grass,
    Tree,
    Stone,
    Wall,
    DoorClosed,
    DoorOpen
}

enum BuildChoice {
    Wall,
    Door
}

enum RecipeChoice {
    Stick,
    Axe,
    Sword,
    Door
}

const WORLD_WIDTH = 64
const WORLD_HEIGHT = 64
const TILE_SIZE = 8
const VIEW_WIDTH = 20
const VIEW_HEIGHT = 13
const HUD_Y = VIEW_HEIGHT * TILE_SIZE
const DAY_LENGTH = 18
const NIGHT_LENGTH = 18

let world: number[][] = []
let damageMap: number[][] = []
let canvas = image.create(160, 120)
let player = sprites.create(img`
    . . 5 5 5 5 . .
    . 5 5 5 5 5 5 .
    5 5 1 5 5 1 5 5
    5 5 5 5 5 5 5 5
    5 5 5 5 5 5 5 5
    . 5 5 5 5 5 5 .
    . 5 . . . . 5 .
    . . . . . . . .
`, SpriteKind.Player)

let playerX = 0
let playerY = 0
let facingX = 0
let facingY = 1
let wood = 0
let stone = 0
let sticks = 0
let doors = 0
let hasAxe = false
let hasSword = false
let buildChoice = BuildChoice.Wall
let recipeChoice = RecipeChoice.Stick
let timeInCycle = 0
let isNight = false
let monsters: Sprite[] = []
let monsterXs: number[] = []
let monsterYs: number[] = []
let monsterHP: number[] = []

function tileAt(x: number, y: number) {
    if (x < 0 || y < 0 || x >= WORLD_WIDTH || y >= WORLD_HEIGHT) {
        return TileType.Stone
    }
    return world[x][y]
}

function setTileAt(x: number, y: number, tile: number) {
    if (x < 0 || y < 0 || x >= WORLD_WIDTH || y >= WORLD_HEIGHT) {
        return
    }
    world[x][y] = tile
    damageMap[x][y] = 0
}

function isWalkable(tile: number) {
    return tile == TileType.Empty || tile == TileType.Grass || tile == TileType.DoorOpen
}

function buildLabel() {
    if (buildChoice == BuildChoice.Wall) {
        return "Wall"
    }
    return "Door"
}

function recipeLabel() {
    if (recipeChoice == RecipeChoice.Stick) {
        return "Stick"
    } else if (recipeChoice == RecipeChoice.Axe) {
        return "Axe"
    } else if (recipeChoice == RecipeChoice.Sword) {
        return "Sword"
    }
    return "Door"
}

function movePlayer(dx: number, dy: number) {
    facingX = dx
    facingY = dy
    let nextX = playerX + dx
    let nextY = playerY + dy
    if (isWalkable(tileAt(nextX, nextY)) && !monsterAt(nextX, nextY)) {
        playerX = nextX
        playerY = nextY
    }
}

function monsterIndexAt(x: number, y: number) {
    for (let i = 0; i < monsters.length; i++) {
        if (monsterXs[i] == x && monsterYs[i] == y) {
            return i
        }
    }
    return -1
}

function monsterAt(x: number, y: number) {
    let index = monsterIndexAt(x, y)
    if (index >= 0) {
        return monsters[index]
    }
    return null
}

function monsterIndex(monster: Sprite) {
    for (let i = 0; i < monsters.length; i++) {
        if (monsters[i] == monster) {
            return i
        }
    }
    return -1
}

function removeMonsterAt(index: number) {
    monsters.removeAt(index)
    monsterXs.removeAt(index)
    monsterYs.removeAt(index)
    monsterHP.removeAt(index)
}

function tileHealth(tile: number) {
    if (tile == TileType.Tree) {
        return 2
    } else if (tile == TileType.Stone) {
        return 3
    } else if (tile == TileType.Wall) {
        return 3
    } else if (tile == TileType.DoorClosed || tile == TileType.DoorOpen) {
        return 2
    }
    return 1
}

function tryBreakTile(x: number, y: number, power: number, fromMonster: boolean) {
    let tile = tileAt(x, y)
    if (tile == TileType.Empty || tile == TileType.Grass) {
        return false
    }
    damageMap[x][y] += power
    if (damageMap[x][y] < tileHealth(tile)) {
        if (!fromMonster) {
            player.sayText("Hit " + damageMap[x][y] + "/" + tileHealth(tile), 300, false)
        }
        return true
    }
    if (tile == TileType.Tree) {
        wood += 2
    } else if (tile == TileType.Stone || tile == TileType.Wall) {
        stone += 1
    } else if (tile == TileType.DoorClosed || tile == TileType.DoorOpen) {
        wood += 1
    }
    setTileAt(x, y, TileType.Empty)
    return true
}

function tryPlaceTile(x: number, y: number) {
    if (tileAt(x, y) != TileType.Empty || monsterAt(x, y)) {
        return false
    }
    if (buildChoice == BuildChoice.Wall) {
        if (stone <= 0) {
            player.sayText("Need stone", 500, false)
            return false
        }
        stone -= 1
        setTileAt(x, y, TileType.Wall)
        return true
    }
    if (doors <= 0) {
        player.sayText("Need door", 500, false)
        return false
    }
    doors -= 1
    setTileAt(x, y, TileType.DoorClosed)
    return true
}

function attackMonster(monster: Sprite) {
    if (monster == null) {
        return false
    }
    let index = monsterIndex(monster)
    if (index < 0) {
        return false
    }
    let damage = hasSword ? 2 : 1
    monsterHP[index] += 0 - damage
    if (monsterHP[index] <= 0) {
        monster.destroy(effects.disintegrate, 100)
        removeMonsterAt(index)
        if (Math.percentChance(40)) {
            stone += 1
        }
    }
    return true
}

function useFacingTile() {
    let tx = playerX + facingX
    let ty = playerY + facingY
    let monster = monsterAt(tx, ty)
    if (attackMonster(monster)) {
        return
    }
    let tile = tileAt(tx, ty)
    if (tile == TileType.DoorClosed) {
        setTileAt(tx, ty, TileType.DoorOpen)
        return
    } else if (tile == TileType.DoorOpen) {
        setTileAt(tx, ty, TileType.DoorClosed)
        return
    }
    if (tile == TileType.Empty) {
        tryPlaceTile(tx, ty)
        return
    }
    let power = hasAxe ? 2 : 1
    tryBreakTile(tx, ty, power, false)
}

function craftCurrentRecipe() {
    if (recipeChoice == RecipeChoice.Stick) {
        if (wood >= 1) {
            wood -= 1
            sticks += 2
            player.sayText("Crafted sticks", 700, false)
        } else {
            player.sayText("Need 1 wood", 700, false)
        }
    } else if (recipeChoice == RecipeChoice.Axe) {
        if (!hasAxe && sticks >= 1 && stone >= 1) {
            sticks -= 1
            stone -= 1
            hasAxe = true
            player.sayText("Crafted axe", 700, false)
        } else if (hasAxe) {
            player.sayText("Already have axe", 700, false)
        } else {
            player.sayText("Need 1 stick + 1 stone", 900, false)
        }
    } else if (recipeChoice == RecipeChoice.Sword) {
        if (!hasSword && sticks >= 1 && stone >= 2) {
            sticks -= 1
            stone -= 2
            hasSword = true
            player.sayText("Crafted sword", 700, false)
        } else if (hasSword) {
            player.sayText("Already have sword", 700, false)
        } else {
            player.sayText("Need 1 stick + 2 stone", 900, false)
        }
    } else if (wood >= 3) {
        wood -= 3
        doors += 1
        player.sayText("Crafted door", 700, false)
    } else {
        player.sayText("Need 3 wood", 700, false)
    }
    recipeChoice = (recipeChoice + 1) % 4
}

function createWorld() {
    for (let x = 0; x < WORLD_WIDTH; x++) {
        world[x] = []
        damageMap[x] = []
        for (let y = 0; y < WORLD_HEIGHT; y++) {
            world[x][y] = TileType.Grass
            damageMap[x][y] = 0
            let roll = randint(0, 99)
            if (roll < 16) {
                world[x][y] = TileType.Tree
            } else if (roll < 28) {
                world[x][y] = TileType.Stone
            }
        }
    }
    playerX = Math.idiv(WORLD_WIDTH, 2)
    playerY = Math.idiv(WORLD_HEIGHT, 2)
    for (let x = playerX - 3; x <= playerX + 3; x++) {
        for (let y = playerY - 3; y <= playerY + 3; y++) {
            if (x >= 0 && y >= 0 && x < WORLD_WIDTH && y < WORLD_HEIGHT) {
                world[x][y] = TileType.Grass
            }
        }
    }
}

function spawnMonster() {
    let monster = sprites.create(img`
        . . 2 2 2 2 . .
        . 2 4 2 2 4 2 .
        2 2 2 2 2 2 2 2
        2 2 2 2 2 2 2 2
        2 2 2 2 2 2 2 2
        . 2 2 2 2 2 2 .
        . 2 . . . . 2 .
        . . . . . . . .
    `, SpriteKind.Monster)
    let spawnX = playerX
    let spawnY = playerY
    while (Math.abs(spawnX - playerX) + Math.abs(spawnY - playerY) < 10 || !isWalkable(tileAt(spawnX, spawnY))) {
        spawnX = randint(1, WORLD_WIDTH - 2)
        spawnY = randint(1, WORLD_HEIGHT - 2)
    }
    monsters.push(monster)
    monsterXs.push(spawnX)
    monsterYs.push(spawnY)
    monsterHP.push(3)
}

function updateMonsters() {
    for (let i = 0; i < monsters.length; i++) {
        let mx = monsterXs[i]
        let my = monsterYs[i]
        let dx = 0
        let dy = 0
        if (Math.abs(playerX - mx) > Math.abs(playerY - my)) {
            dx = playerX > mx ? 1 : -1
        } else if (playerY != my) {
            dy = playerY > my ? 1 : -1
        } else if (playerX != mx) {
            dx = playerX > mx ? 1 : -1
        }
        let tx = mx + dx
        let ty = my + dy
        if (Math.abs(playerX - mx) + Math.abs(playerY - my) == 1) {
            info.changeLifeBy(-1)
            continue
        }
        if (tx == playerX && ty == playerY) {
            info.changeLifeBy(-1)
            continue
        }
        let targetTile = tileAt(tx, ty)
        if (isWalkable(targetTile) && !monsterAt(tx, ty)) {
            monsterXs[i] = tx
            monsterYs[i] = ty
        } else if (targetTile == TileType.Wall || targetTile == TileType.DoorClosed || targetTile == TileType.DoorOpen) {
            tryBreakTile(tx, ty, 1, true)
        }
    }
}

function clearMonsters() {
    for (let monster of monsters) {
        monster.destroy()
    }
    monsters = []
    monsterXs = []
    monsterYs = []
    monsterHP = []
}

function drawTile(tile: number, sx: number, sy: number) {
    if (tile == TileType.Empty) {
        canvas.fillRect(sx, sy, TILE_SIZE, TILE_SIZE, 1)
    } else if (tile == TileType.Grass) {
        canvas.fillRect(sx, sy, TILE_SIZE, TILE_SIZE, isNight ? 7 : 7)
        canvas.fillRect(sx, sy + 6, TILE_SIZE, 2, isNight ? 6 : 7)
    } else if (tile == TileType.Tree) {
        canvas.fillRect(sx, sy, TILE_SIZE, TILE_SIZE, 7)
        canvas.fillRect(sx + 3, sy + 4, 2, 4, 4)
        canvas.fillRect(sx + 1, sy + 1, 6, 4, isNight ? 6 : 8)
    } else if (tile == TileType.Stone) {
        canvas.fillRect(sx, sy, TILE_SIZE, TILE_SIZE, isNight ? 13 : 1)
        canvas.fillRect(sx + 1, sy + 1, 6, 6, isNight ? 12 : 13)
    } else if (tile == TileType.Wall) {
        canvas.fillRect(sx, sy, TILE_SIZE, TILE_SIZE, isNight ? 12 : 13)
        canvas.drawLine(sx, sy + 3, sx + 7, sy + 3, 1)
        canvas.drawLine(sx, sy + 7, sx + 7, sy + 7, 1)
        canvas.drawLine(sx + 3, sy, sx + 3, sy + 3, 1)
    } else if (tile == TileType.DoorClosed) {
        canvas.fillRect(sx, sy, TILE_SIZE, TILE_SIZE, 4)
        canvas.drawLine(sx + 4, sy, sx + 4, sy + 7, 15)
        canvas.setPixel(sx + 6, sy + 4, 2)
    } else {
        canvas.fillRect(sx, sy, TILE_SIZE, TILE_SIZE, 1)
        canvas.drawRect(sx + 1, sy + 1, 6, 6, 4)
    }
}

function renderWorld() {
    let cameraX = Math.max(0, Math.min(playerX - Math.idiv(VIEW_WIDTH, 2), WORLD_WIDTH - VIEW_WIDTH))
    let cameraY = Math.max(0, Math.min(playerY - Math.idiv(VIEW_HEIGHT, 2), WORLD_HEIGHT - VIEW_HEIGHT))
    canvas.fillRect(0, 0, 160, 120, isNight ? 15 : 9)
    for (let vx = 0; vx < VIEW_WIDTH; vx++) {
        for (let vy = 0; vy < VIEW_HEIGHT; vy++) {
            drawTile(tileAt(cameraX + vx, cameraY + vy), vx * TILE_SIZE, vy * TILE_SIZE)
        }
    }
    canvas.fillRect(0, HUD_Y, 160, 16, 15)
    canvas.print("W" + wood + " S" + stone + " T" + sticks + " D" + doors, 2, HUD_Y + 1, 1)
    canvas.print(buildLabel() + " " + recipeLabel(), 2, HUD_Y + 9, 1)
    canvas.print(isNight ? "Night" : "Day", 108, HUD_Y + 1, isNight ? 2 : 7)
    canvas.print(hasAxe ? "Axe" : "-", 108, HUD_Y + 9, 1)
    canvas.print(hasSword ? "Sword" : "-", 132, HUD_Y + 9, 1)
    scene.setBackgroundImage(canvas)
    player.setPosition((playerX - cameraX) * TILE_SIZE + 4, (playerY - cameraY) * TILE_SIZE + 4)
    for (let i = 0; i < monsters.length; i++) {
        let monster = monsters[i]
        let mx = monsterXs[i]
        let my = monsterYs[i]
        let screenX = (mx - cameraX) * TILE_SIZE + 4
        let screenY = (my - cameraY) * TILE_SIZE + 4
        if (mx >= cameraX && my >= cameraY && mx < cameraX + VIEW_WIDTH && my < cameraY + VIEW_HEIGHT) {
            monster.setFlag(SpriteFlag.Invisible, false)
            monster.setPosition(screenX, screenY)
        } else {
            monster.setFlag(SpriteFlag.Invisible, true)
        }
    }
}

controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    movePlayer(-1, 0)
})

controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    movePlayer(1, 0)
})

controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    movePlayer(0, -1)
})

controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    movePlayer(0, 1)
})

controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    useFacingTile()
})

controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    buildChoice = (buildChoice + 1) % 2
    player.sayText("Build: " + buildLabel(), 600, false)
})

controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
    craftCurrentRecipe()
})

info.onLifeZero(function () {
    game.over(false)
})

game.onUpdate(function () {
    renderWorld()
})

game.onUpdateInterval(800, function () {
    if (isNight) {
        updateMonsters()
    }
})

game.onUpdateInterval(1000, function () {
    timeInCycle += 1
    if (!isNight && timeInCycle >= DAY_LENGTH) {
        isNight = true
        timeInCycle = 0
        player.sayText("Night! Monsters!", 1000, false)
        for (let i = 0; i < 5; i++) {
            spawnMonster()
        }
    } else if (isNight && timeInCycle >= NIGHT_LENGTH) {
        isNight = false
        timeInCycle = 0
        clearMonsters()
        player.sayText("Daybreak", 1000, false)
    } else if (isNight && Math.percentChance(25) && monsters.length < 8) {
        spawnMonster()
    }
})

scene.setBackgroundColor(9)
info.setLife(10)
createWorld()
game.showLongText("2Craft\nArrows move\nA mine, fight, open, place\nB switch wall or door\nMenu crafts and cycles recipes\nCraft stick, axe, sword, door\nUse stone for walls", DialogLayout.Full)
renderWorld()
