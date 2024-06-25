import { open } from "@raycast/api";

export const SIZE: number = 8;
const BOMB_COUNT: number = 8;
const TOTAL_SQUARES = 64;

export enum CellState {
  Grey = "#A0A0A0",
  Lost = "#FF0000",
  Won = "#00FF00",
  Flag = "🚩",
  Bomb = "💣", // not currently displayable, only used for debuggin' (actual_board)
}

export interface Cell {
  state: CellState | number;
  revealed: boolean;
}

// game logic
export default class Game {
  board: Cell[][];
  actual_board: Cell[][];

  constructor(board?: Cell[][], actual_board?: Cell[][]) {
    this.board = board ? board : [];
    this.actual_board = actual_board ? actual_board : [];
  }

  init() {
    // TODO: Zero-open

    // pushing grey cells to the board
    console.log("calling init");
    for (let i = 0; i < SIZE; i++) {
      this.board[i] = [];
      this.actual_board[i] = [];

      for (let j = 0; j < SIZE; j++) {
        const actual_cell: Cell = {
          state: CellState.Grey,
          revealed: false,
        };

        const player_cell: Cell = {
          state: CellState.Grey,
          revealed: false,
        };

        this.actual_board[i].push(actual_cell);
        this.board[i].push(player_cell);
      }
    }

    // placing mines
    for (let i = 0; i < BOMB_COUNT; i++) {
      let rand_row, rand_col;
      do {
        rand_row = Math.floor(Math.random() * SIZE);
        rand_col = Math.floor(Math.random() * SIZE);
      } while (this.actual_board[rand_row][rand_col].state === CellState.Bomb);

      this.actual_board[rand_row][rand_col].state = CellState.Bomb;
      console.log("placing mine at:", rand_row, rand_col);
    }

    return this;
  }

  static updateBoardState(board: Cell[][], state: CellState) {
    for (const row of board) {
      for (const cell of row) {
        cell.state = state;
      }
    }
  }

  lose() {
    const newBoard = new Game(this.board, this.actual_board);

    console.log("Lost");
    Game.updateBoardState(newBoard.board, CellState.Lost);

    // TODO: reveal bomb positions

    return newBoard;
  }

  win() {
    const newBoard = new Game(this.board, this.actual_board);

    console.log("Win");
    Game.updateBoardState(newBoard.board, CellState.Won);

    setTimeout(() => {
      open("raycast://confetti");
    }, 5000);

    return newBoard;
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

    console.log("opened cells:", revealed_count);
    return revealed_count === TOTAL_SQUARES - BOMB_COUNT;
  }

  open(row: number, col: number): Game {
    const newBoard = new Game(this.board, this.actual_board);

    const cell = newBoard.board[row][col];
    const actual_cell = newBoard.actual_board[row][col];
    console.log("opening", row, col);
    console.log(actual_cell.state);

    if (actual_cell.state === CellState.Bomb) {
      return this.lose();
    }

    if (typeof cell.state === "number") {
      const neighbours = Game.neighbours(row, col);

      for (const [nx, ny] of neighbours) {
        if (!Game.isInBounds(nx, ny) || newBoard.board[nx][ny].state === CellState.Flag) continue;

        if (this.actual_board[nx][ny].state === CellState.Bomb) {
          return this.lose();
        }

        if (newBoard.board[nx][ny].state === CellState.Grey) {
          this.open(nx, ny);
        }
      }
    }

    const bombs_around = this.getMinesCount(row, col);
    cell.state = bombs_around;
    cell.revealed = true;

    if (bombs_around === 0) {
      this.floodFill(row, col);
      console.log("Starting floodfill");
    }

    if (this.checkWin()) {
      return this.win();
    }

    return newBoard;
  }

  floodFill(row: number, col: number) {
    const newBoard = new Game(this.board, this.actual_board);

    const cell = newBoard.board[row][col];

    const bombs_around = this.getMinesCount(row, col);
    cell.state = bombs_around;
    cell.revealed = true;

    if (bombs_around == 0) {
      const neighbours = Game.neighbours(row, col);

      neighbours.forEach(([nx, ny]) => {
        if (!Game.isInBounds(nx, ny) || newBoard.board[nx][ny].revealed) {
          return;
        }

        this.floodFill(nx, ny);
      });
    }
  }

  static isInBounds(row: number, col: number) {
    return row < SIZE && row >= 0 && col < SIZE && col >= 0;
  }

  static neighbours(x: number, y: number) {
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
    let minesCount = 0;
    for (const [r, c] of Game.neighbours(row, col)) {
      if (Game.isInBounds(r, c) && this.actual_board[r][c].state === CellState.Bomb) {
        minesCount++;
      }
    }
    return minesCount;
  }

  flag(row: number, col: number) {
    const newBoard = new Game(this.board, this.actual_board);

    const cell = newBoard.board[row][col];
    console.log(newBoard.actual_board[row][col]);

    if (cell.state === CellState.Flag) {
      cell.state = CellState.Grey;
      return newBoard;
    }

    cell.state = CellState.Flag;

    return newBoard;
  }
}
