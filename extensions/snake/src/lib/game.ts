import { TextSize } from "../components/snake";
import { getRandomInt } from "./utils";

const foodSymbol = "O";
const snakeSymbol = "▉";
const emptySymbol = " ";

function addCoords(c1: Coord, c2: Coord): Coord {
  return { x: c1.x + c2.x, y: c1.y + c2.y };
}

function deltaMoveCoordRelative(dir: Move, coord: Coord): Coord {
  let moveX = 0;
  let moveY = 0;
  switch (dir) {
    case Move.up:
      {
        moveY = -1;
      }
      break;
    case Move.down:
      {
        moveY = 1;
      }
      break;
    case Move.left:
      {
        moveX = -1;
      }
      break;
    case Move.right:
      {
        moveX = 1;
      }
      break;
  }
  return { x: moveX, y: moveY };
}

function deltaMoveCoordAbsolute(dir: Move, coord: Coord): Coord {
  return addCoords(deltaMoveCoordRelative(dir, coord), coord);
}

export interface GameScore {
  food: number;
  speed: number;
}

export interface Coord {
  x: number;
  y: number;
}

export enum Move {
  up,
  down,
  left,
  right,
}

class Snake {
  head: Coord;
  body: Coord[];
  bodyLength = 3;

  constructor(startPos: Coord) {
    this.head = startPos;
    this.body = [];
  }

  move(relCoord: Coord, game: Game) {
    const field = game.field;
    const newPos = addCoords(this.head, relCoord);
    const ev = field.getValue(newPos);
    if (ev === foodSymbol) {
      this.bodyLength += 1;
      game.increaseFood();
      game.spawnFood();
    } else if (ev === undefined || ev === snakeSymbol) {
      game.setMessage("Game Over 😝");
      return;
    }

    field.setValue(newPos, snakeSymbol);

    const drawBody = (symbol: string) => {
      for (const c of this.body) {
        field.setValue(c, symbol);
      }
    };
    drawBody(emptySymbol);
    this.body = [this.head].concat(this.body);
    this.body = this.body.slice(0, this.bodyLength);
    drawBody(snakeSymbol);
    this.head = newPos;
  }
}

export class Field {
  width = 104;
  height = 18;
  data: string[] = [];
  constructor() {
    this.clearField();
  }

  setSize(textSize: TextSize) {
    if (textSize === "medium") {
      this.width = 104;
      this.height = 18;
    } else {
      this.width = 90;
      this.height = 14;
    }
  }

  clearField() {
    const result: string[] = [];
    for (let i = 0; i < this.height * this.width; i++) {
      result.push(emptySymbol);
    }
    this.data = result;
  }

  isValidCoord(coord: Coord) {
    if (coord.x < 0 || coord.y < 0) {
      return false;
    }
    if (coord.x >= this.width || coord.y > this.height) {
      return false;
    }
    return true;
  }

  coordToIndex(coord: Coord): number {
    return this.width * coord.y + coord.x;
  }

  getValue(coord: Coord): string | undefined {
    if (this.isValidCoord(coord)) {
      const i = this.coordToIndex(coord);
      return this.data[i];
    } else {
      return undefined;
    }
  }

  setValue(coord: Coord, value: string) {
    if (this.isValidCoord(coord)) {
      const i = this.coordToIndex(coord);
      this.data[i] = value;
    }
  }

  public isFieldFull(): boolean {
    for (const d of this.data) {
      if (d === emptySymbol) {
        return false;
      }
    }
    return true;
  }

  public getRandomFreeCoord(): Coord | undefined {
    const freeCoords: Coord[] = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const coord: Coord = { x, y };
        const val = this.getValue(coord);
        if (val === emptySymbol) {
          freeCoords.push(coord);
        }
      }
    }
    if (freeCoords.length > 0) {
      const index = getRandomInt(0, freeCoords.length);
      return freeCoords[index];
    }
    return undefined;
  }

  public toString(): string {
    let result = "\n";
    for (let y = -1; y <= this.height; y++) {
      for (let x = -1; x <= this.width; x++) {
        let v: string | undefined = emptySymbol;
        if (y == -1 || y === this.height || x == -1 || x === this.width) {
          if (x === -1 && y === -1) {
            v = "╔";
          } else if (x === this.width && y === -1) {
            v = "╗";
          } else if (x === -1 && y === this.height) {
            v = "╚";
          } else if (x === this.width && y === this.height) {
            v = "╝";
          } else if (y === -1 || y === this.height) {
            v = "═";
          } else if (x == -1 || x === this.width) {
            v = "║";
          } else {
            v = " ";
          }
        } else {
          v = this.getValue({ x, y });
          if (!v) {
            console.log(`value of ${x}, ${y} is undefined`);
          }
        }
        result += v;
      }
      result += "\n";
    }
    return result;
  }
}

export class Game {
  public field: Field = new Field();
  private setField: React.Dispatch<React.SetStateAction<string>>;
  private timeout: NodeJS.Timeout | undefined;
  private snakeDirection: Move = Move.right;
  public error: string | undefined;
  public setError: React.Dispatch<React.SetStateAction<string | undefined>>;
  public setMessage: React.Dispatch<React.SetStateAction<string | undefined>>;
  public setScore: React.Dispatch<React.SetStateAction<GameScore | undefined>>;
  private snake: Snake;
  private foodCount = 0;
  private speedMs = 1000;
  private minSpeedMs = 150;
  private maxSpeedMs = 30;
  public speed = 1;

  constructor(
    setField: React.Dispatch<React.SetStateAction<string>>,
    setError: React.Dispatch<React.SetStateAction<string | undefined>>,
    setScore: React.Dispatch<React.SetStateAction<GameScore | undefined>>,
    setMessage: React.Dispatch<React.SetStateAction<string | undefined>>,
  ) {
    this.setField = setField;
    this.setError = setError;
    this.setScore = setScore;
    this.setMessage = setMessage;
    this.snake = new Snake({ x: 2, y: 2 });
  }

  public flush() {
    this.setField(this.field.toString());
  }

  public getSpeedMs(): number {
    const sd = this.snakeDirection;
    if (sd === Move.up || sd === Move.down) {
      return Math.floor(this.speedMs + this.speedMs * 0.2);
    }
    return this.speedMs;
  }

  public start(textSize: TextSize) {
    this.field.setSize(textSize);
    this.field.clearField();
    this.setError(undefined);
    this.snake = new Snake({ x: getRandomInt(20, 80), y: getRandomInt(5, this.field.height - 5) });
    this.foodCount = 0;
    this.speed = 1;
    this.speedMs = this.minSpeedMs;
    this.setScore({ food: this.foodCount, speed: 1 });
    this.spawnFood();
  }

  public move(m: Move) {
    const nextCoord = deltaMoveCoordAbsolute(m, this.snake.head);
    const v = this.field.getValue(nextCoord);
    const ok = v && v === snakeSymbol ? false : true;
    if (ok) {
      this.snakeDirection = m;
    }
  }

  public increaseFood() {
    this.foodCount += 1;
    let newSpeedMs = this.speedMs - 5;
    let addSpeed = true;
    if (newSpeedMs < this.maxSpeedMs) {
      newSpeedMs = this.maxSpeedMs;
      addSpeed = false;
    }
    this.speedMs = newSpeedMs;
    if (addSpeed) {
      this.speed += 1;
    }
    this.setScore({ food: this.foodCount, speed: this.speed });
    if (this.field.isFieldFull()) {
      this.setMessage("You win 😀");
    }
  }

  spawnFood() {
    const coord = this.field.getRandomFreeCoord();
    if (coord) {
      this.field.setValue(coord, foodSymbol);
    }
  }

  draw() {
    try {
      const mm = this.snakeDirection;
      let moveX = 0;
      let moveY = 0;
      switch (mm) {
        case Move.up:
          {
            moveY = -1;
          }
          break;
        case Move.down:
          {
            moveY = 1;
          }
          break;
        case Move.left:
          {
            moveX = -1;
          }
          break;
        case Move.right:
          {
            moveX = 1;
          }
          break;
      }
      this.snake.move({ x: moveX, y: moveY }, this);

      this.setField(this.field.toString());
    } catch (error: any) {
      this.setError(error.message);
    }
  }

  public stop() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = undefined;
    }
  }
}
