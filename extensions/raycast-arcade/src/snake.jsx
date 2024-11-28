import React, { useState, useEffect, useRef } from "react";
import { ActionPanel, Action, List, environment, Icon } from "@raycast/api";

let smallText = environment.textSize === "medium";

const ROWS = smallText ? 18 : 15;
const COLS = smallText ? 30 : 26;

const initialGrid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => "  "));

const Direction = {
  UP: "UP",
  DOWN: "DOWN",
  LEFT: "LEFT",
  RIGHT: "RIGHT",
};

const Status = {
  START: "START",
  PLAYING: "PLAYING",
  GAME_OVER: "GAME_OVER",
};

let speed = 250;

export default function Command() {
  const [grid, setGrid] = useState(initialGrid);
  const [snake, setSnake] = useState([
    { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) },
    { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) - 1 },
    { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) - 2 },
  ]);
  const food = useRef(
    randomFood([
      { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) },
      { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) - 1 },
      { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) - 2 },
    ]),
  );
  const [score, setScore] = useState(0);
  const queuedDirection = useRef(Direction.RIGHT);
  const direction = useRef(Direction.RIGHT);
  const intervalRef = useRef(null); // Separate ref for interval identifier
  const [markdown, setMarkdown] = useState("");
  const [selectedTab, setSelectedTab] = useState("game");
  const [status, setStatus] = useState(Status.START);

  useEffect(() => {
    const newGrid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => "  "));
    snake.forEach(({ row, col }, i) => {
      if (i % 2 === 0) {
        newGrid[row][col] = "░░";
      } else {
        newGrid[row][col] = "▒▒";
      }
    });
    const { row: foodRow, col: foodCol } = food.current;
    newGrid[foodRow][foodCol] = "██";
    setGrid(newGrid);
  }, [snake]);

  function moveSnake() {
    setSnake((oldSnake) => {
      direction.current = queuedDirection.current;
      const head = { ...oldSnake[0] };
      switch (direction.current) {
        case Direction.UP:
          head.row--;
          break;
        case Direction.DOWN:
          head.row++;
          break;
        case Direction.LEFT:
          head.col--;
          break;
        case Direction.RIGHT:
          head.col++;
          break;
      }

      const hitWall = head.row < 0 || head.row >= ROWS || head.col < 0 || head.col >= COLS;
      const hitSelf = oldSnake.some(
        (segment, index) => index !== 0 && segment.row === head.row && segment.col === head.col,
      );
      if (hitWall || hitSelf) {
        clearInterval(intervalRef.current); // Clear interval using the ref's current value
        intervalRef.current = null;
        setStatus(Status.GAME_OVER);
        setMarkdown(gameOver);
        return oldSnake;
      }
      const newSnake = [head, ...oldSnake.slice(0, oldSnake.length - 1)];
      if (head.row === food.current.row && head.col === food.current.col) {
        food.current = randomFood(newSnake);
        newSnake.push(head);
        setScore((score) => score + 100);
      }
      return newSnake;
    });
  }

  useEffect(() => {
    if (status === Status.START) {
      setMarkdown(gameStart);
    }
    if (status === Status.PLAYING) {
      const rows = grid.map((row) => "│" + row.join("") + "│");
      if (smallText) {
        setMarkdown(`
\`\`\`
╭──────────────────────RAYCAST ARCADE────────────────────────╮
${rows.join("\n")}
╰──────────────────────┤SCORE: ${(score + "").padStart(6, "0")}├───────────────────────╯
\`\`\`
          `);
      } else {
        setMarkdown(`
\`\`\`
╭───────────────────RAYCAST ARCADE───────────────────╮
${rows.join("\n")}
╰──────────────────┤SCORE: ${(score + "").padStart(6, "0")}├───────────────────╯
\`\`\`
          `);
      }
    }
    if (status === Status.GAME_OVER) {
      setMarkdown(gameOver);
    }
  }, [grid, status]);

  function handleKeyDown(event) {
    let newDirection;
    switch (event) {
      case "ArrowUp":
        if (direction.current !== Direction.DOWN) newDirection = Direction.UP;
        else newDirection = direction.current;
        break;
      case "ArrowDown":
        if (direction.current !== Direction.UP) newDirection = Direction.DOWN;
        else newDirection = direction.current;
        break;
      case "ArrowLeft":
        if (direction.current !== Direction.RIGHT) newDirection = Direction.LEFT;
        else newDirection = direction.current;
        break;
      case "ArrowRight":
        if (direction.current !== Direction.LEFT) newDirection = Direction.RIGHT;
        else newDirection = direction.current;
        break;
      default:
        newDirection = direction.current;
        return;
    }
    queuedDirection.current = newDirection;
  }

  function randomFood(snake) {
    const emptyCells = [];
    grid.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        if (cell === "  " && !snake.some((segment) => segment.row === rowIndex && segment.col === colIndex)) {
          emptyCells.push({ row: rowIndex, col: colIndex });
        }
      });
    });
    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
  }

  let gameOver = smallText
    ? `
  \`\`\`
  ╭──────────────────────RAYCAST ARCADE────────────────────────╮
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                         GAME OVER!                         │
  │                  PRESS ENTER TO TRY AGAIN                  │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  ╰──────────────────────┤SCORE: ${(score + "").padStart(6, "0")}├───────────────────────╯
  \`\`\`
  `
    : `
  \`\`\`
╭───────────────────RAYCAST ARCADE───────────────────╮
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                     GAME OVER!                     │
│              PRESS ENTER TO TRY AGAIN              │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
╰──────────────────┤SCORE: ${(score + "").padStart(6, "0")}├───────────────────╯
\`\`\`
  `;
  let gameStart = smallText
    ? `
  \`\`\`
  ╭──────────────────────RAYCAST ARCADE────────────────────────╮
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                       RAYCAST SNAKE.                       │
  │                    PRESS ENTER TO PLAY.                    │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  │                                                            │
  ╰──────────────────────┤SCORE: ${(score + "").padStart(6, "0")}├───────────────────────╯
  \`\`\`
  `
    : `
  \`\`\`
╭───────────────────RAYCAST ARCADE───────────────────╮
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                   RAYCAST SNAKE.                   │
│                PRESS ENTER TO PLAY.                │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
│                                                    │
╰──────────────────┤SCORE: ${(score + "").padStart(6, "0")}├───────────────────╯
\`\`\`
  `;

  return (
    <List
      searchText=""
      onSearchTextChange={(e) => {
        if (e === "w") {
          handleKeyDown("ArrowUp");
        }
        if (e === "a") {
          handleKeyDown("ArrowLeft");
        }
        if (e === "s") {
          handleKeyDown("ArrowDown");
        }
        if (e === "d") {
          handleKeyDown("ArrowRight");
        }
      }}
      navigationTitle="Snake"
      searchBarPlaceholder="Focus your cursor here..."
      isShowingDetail={true}
      selectedItemId={selectedTab}
      onSelectionChange={(e) => {
        setSelectedTab(e);
        if (e === "help") {
          clearInterval(intervalRef.current); // Clear interval using the ref's current value
          intervalRef.current = null;
        }
        if (e === "game" && intervalRef.current == null && !(status == Status.START || status == Status.GAME_OVER)) {
          // Check intervalRef.current instead of snakeInterval
          intervalRef.current = setInterval(moveSnake, speed); // Store the new identifier in the ref
        }
      }}
    >
      <List.Item
        id="game"
        title={"Snake"}
        icon={Icon.Play}
        detail={<List.Item.Detail markdown={markdown} />}
        actions={
          <ActionPanel title="Game controls">
            <Action
              icon={status === Status.PLAYING ? Icon.Pause : Status.START ? Icon.Play : Icon.RotateClockwise}
              title={status === Status.PLAYING ? "Pause" : Status.START ? "Play" : "Replay"}
              onAction={() => {
                if (status === Status.PLAYING) {
                  setSelectedTab("help");
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                if (status === Status.GAME_OVER) {
                  setGrid(Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => "  ")));
                  setStatus(Status.PLAYING);
                  setScore(0);
                  food.current = randomFood(snake);
                  setSnake([
                    { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) },
                    { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) - 1 },
                    { row: Math.floor(ROWS / 2), col: Math.floor(COLS / 2) - 2 },
                  ]);

                  queuedDirection.current = Direction.RIGHT;

                  direction.current = Direction.RIGHT;

                  intervalRef.current = setInterval(moveSnake, speed);
                }
                if (status === Status.START) {
                  setStatus(Status.PLAYING);
                  intervalRef.current = setInterval(moveSnake, speed);
                }
              }}
            />
            <Action
              title="Up"
              icon={Icon.ArrowUp}
              shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
              onAction={() => handleKeyDown("ArrowUp")}
            />
            <Action
              title="Down"
              icon={Icon.ArrowDown}
              shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
              onAction={() => handleKeyDown("ArrowDown")}
            />
            <Action
              title="Left"
              icon={Icon.ArrowLeft}
              shortcut={{ modifiers: ["shift"], key: "arrowLeft" }}
              onAction={() => handleKeyDown("ArrowLeft")}
            />
            <Action
              title="Right"
              icon={Icon.ArrowRight}
              shortcut={{ modifiers: ["shift"], key: "arrowRight" }}
              onAction={() => handleKeyDown("ArrowRight")}
            />
          </ActionPanel>
        }
      />
      <List.Item
        id="help"
        icon={Icon.Pause}
        title={"Help / Pause"}
        detail={
          <List.Item.Detail
            markdown={
              "# ⏸ GAME PAUSED \n # Intro\nWelcome to Snake, in Raycast Arcade. Your goal is to eat the apples (fully filled in squares) for 100 points each, but you cannot touch the walls or yourself. If you do, it's game over. \n # Controls \n In order to play, make sure you focus your cursor on the top search bar, and use WASD to navigate your Snake. You can also use the arrow keys, but you're going to have to include Shift as a modifier while using arrows."
            }
          />
        }
        actions={
          <ActionPanel title="Game Controls">
            <Action
              icon={Icon.Play}
              title={status === Status.PLAYING ? "Unpause" : "Return to Game"}
              onAction={() => {
                if (status === Status.START) {
                  setSelectedTab("game");
                }
                if (status === Status.PLAYING) {
                  setSelectedTab("game");
                  intervalRef.current = setInterval(moveSnake, speed);
                }
                if (status === Status.GAME_OVER) {
                  setSelectedTab("game");
                }
              }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
