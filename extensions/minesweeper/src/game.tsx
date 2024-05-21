import { open } from "@raycast/api";
import { SIZE, BOMB_COUNT, TOTAL_SQUARES } from "./sweep";

export enum CellState {
  Grey = "#a0a0a0",
  Revealed = "#FFFFFF", // intentionally doesn't work, i like the grey
  Lost = "#FF0000",
  Won = "#00FF00",
  Flag = "🚩",
  Bomb = "💣",
}

export interface Cell {
  state: CellState | number;
  revealed: boolean;
}

// game logic
export class Game {
  board: Cell[][];
  actual_board: Cell[][];

  constructor() {
    // TODO: Zero-open
    this.board = [];
    this.actual_board = [];

    for (let i = 0; i < SIZE; i++) {
      this.board[i] = [];
      this.actual_board[i] = [];
      for (let j = 0; j < SIZE; j++) {
        const cell: Cell = {
          state: CellState.Grey,
          revealed: false,
        };
        this.actual_board[i].push(cell);
        this.board[i].push(cell);
      }
    }

    for (let i = 0; i < BOMB_COUNT; i++) {
      const rand_row = Math.floor(Math.random() * SIZE);
      const rand_col = Math.floor(Math.random() * SIZE);
      const bomb: Cell = {
        state: CellState.Bomb,
        revealed: false,
      };
      this.actual_board[rand_row][rand_col] = bomb;
      console.log("placing mine at, ", rand_row, rand_col);
    }
  }

  lose() {
    console.log("LOST");

    for (let i = 0; i < SIZE; i++) { // changing all squares to red
      for (let j = 0; j < SIZE; j++) {
        console.log("changing pixel", i, j, "to red");
        this.board[i][j].state = CellState.Lost;
      }
    }

    return;
  }

  win() {
    console.log("WON");

    for (let i = 0; i < SIZE; i++) { // changing all squares to gree
      for (let j = 0; j < SIZE; j++) {
        console.log("changing pixel", i, j, "to green");
        this.board[i][j].state = CellState.Won;
      }
    }

    setTimeout(() => {
      open("raycast://confetti");
    }, 5000);
    return;
  }

  checkWin() {
    let revealed_count = 0;

    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        if (this.board[i][j].revealed) {
          revealed_count++;
        }
      }
    }

    console.log("unopened cells:", revealed_count);
    return revealed_count === TOTAL_SQUARES - BOMB_COUNT;
  }

  open(row: number, col: number): void {
    const cell = this.board[row][col];
    const actual_cell = this.actual_board[row][col];

    if (actual_cell.state === CellState.Bomb) { // you lose if it's a bomb
      this.lose();
      return;
    }

    if (typeof cell.state === "number") {
      const neighbours = this.neighbours(row, col);

      for (const [nx, ny] of neighbours) {
        if (!this.isInBounds(nx, ny) || this.board[nx][ny].state === CellState.Flag) continue;

        if (this.actual_board[nx][ny].state === CellState.Bomb) {
          this.lose();
          return;
        }

        if (this.board[nx][ny].state === CellState.Grey) {
          this.open(nx, ny);
        }
      }
    }

    const bombs_around = this.getMinesCount(row, col);
    cell.state = bombs_around;
    cell.revealed = true;

    console.log(this.board[row][col]);

    if (bombs_around === 0) {
      this.floodFill(row, col);
      console.log("START FLOODFILL");
    }

    if (this.checkWin()) {
      this.win();
    }
  }

  floodFill(row: number, col: number) {
    const neighbours = this.neighbours(row, col);

    const cell = this.board[row][col];

    const bombs_around = this.getMinesCount(row, col);
    cell.state = bombs_around as number;
    cell.revealed = true;

    if (bombs_around == 0) {
      neighbours.forEach(([nx, ny]) => {
        if (!this.isInBounds(nx, ny) || this.actual_board[nx][ny].revealed) {
          return;
        }

        this.floodFill(nx, ny);
      });
    }
  }

  isInBounds(row: number, col: number) {
    return row < SIZE && row >= 0 && col < SIZE && col >= 0;
  }

  neighbours(x: number, y: number) {
    return [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
      [x - 1, y - 1],
      [x - 1, y + 1],
      [x + 1, y - 1],
      [x + 1, y + 1],
    ];
  }

  getMinesCount(row: number, col: number) {
    let mines_count = 0;

    for (let i = Math.max(0, row - 1); i <= Math.min(7, row + 1); i++) {
      for (let j = Math.max(0, col - 1); j <= Math.min(7, col + 1); j++) {
        if (!(i === row && j === col) && this.actual_board[i][j].state === CellState.Bomb) {
          mines_count++;
        }
      }
    }
    return mines_count;
  }

  flag(row: number, col: number) {
    const cell = this.board[row][col];
    if (cell.state === CellState.Flag) {
      cell.state = CellState.Grey;
      return;
    }
    cell.state = CellState.Flag;
  }
}

