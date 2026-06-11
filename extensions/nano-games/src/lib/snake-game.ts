import { GRID_HEIGHT, GRID_WIDTH, INITIAL_SNAKE_LENGTH, RIGHT } from "./constants";
import { CellType, type GameState, type Point } from "./types";

export function createInitialState(): GameState {
  const grid = new Array(GRID_WIDTH * GRID_HEIGHT).fill(null);
  const snake: Point[] = [];

  for (let x = 0; x < INITIAL_SNAKE_LENGTH; x++) {
    const y = 2;
    snake.unshift({ x, y });
    grid[x + y * GRID_WIDTH] = CellType.Snake;
  }

  const state: GameState = {
    grid,
    snake,
    currentDirection: RIGHT,
    moveQueue: [],
    hasMoved: false,
    score: 0,
  };

  return dropFood(state);
}

export function cellAt(grid: (CellType | null)[], x: number, y: number): CellType | null {
  if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return null;
  return grid[x + y * GRID_WIDTH];
}

function setCellAt(grid: (CellType | null)[], x: number, y: number, type: CellType | null) {
  grid[x + y * GRID_WIDTH] = type;
}

export function dropFood(state: GameState): GameState {
  const nextGrid = [...state.grid];
  const emptyCells: number[] = [];

  for (let i = 0; i < nextGrid.length; i++) {
    if (nextGrid[i] === null) {
      emptyCells.push(i);
    }
  }

  if (emptyCells.length === 0) return state;

  const randomIndex = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  nextGrid[randomIndex] = CellType.Food;

  return { ...state, grid: nextGrid };
}

export function tick(state: GameState): {
  state: GameState;
  gameOver: boolean;
} {
  let { currentDirection } = state;
  const moveQueue = [...state.moveQueue];

  if (moveQueue.length > 0) {
    currentDirection = moveQueue.pop()!;
  }

  const head = state.snake[0];
  const tail = state.snake[state.snake.length - 1];
  const nextX = head.x + currentDirection.x;
  const nextY = head.y + currentDirection.y;

  const outOfBounds = nextX < 0 || nextX >= GRID_WIDTH || nextY < 0 || nextY >= GRID_HEIGHT;
  const collidesWithSelf =
    cellAt(state.grid, nextX, nextY) === CellType.Snake && !(nextX === tail.x && nextY === tail.y);

  if (outOfBounds || collidesWithSelf) {
    return { state, gameOver: true };
  }

  const nextGrid = [...state.grid];
  const nextSnake = [...state.snake];
  const eatsFood = cellAt(state.grid, nextX, nextY) === CellType.Food;

  if (!eatsFood) {
    nextSnake.pop();
    setCellAt(nextGrid, tail.x, tail.y, null);
  }

  setCellAt(nextGrid, nextX, nextY, CellType.Snake);
  nextSnake.unshift({ x: nextX, y: nextY });

  let nextState = {
    ...state,
    grid: nextGrid,
    snake: nextSnake,
    currentDirection,
    moveQueue,
    score: nextSnake.length - INITIAL_SNAKE_LENGTH,
  };

  if (eatsFood) {
    nextState = dropFood(nextState);
  }

  return { state: nextState, gameOver: false };
}

export function enqueueDirection(state: GameState, dir: Point): GameState {
  const lastDir = state.moveQueue[0] || state.currentDirection;
  const opposite = dir.x + lastDir.x === 0 && dir.y + lastDir.y === 0;
  if (opposite) return state;

  return {
    ...state,
    moveQueue: [dir, ...state.moveQueue],
    hasMoved: true,
  };
}
