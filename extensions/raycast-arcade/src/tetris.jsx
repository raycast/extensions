import React, { useState, useEffect, useRef } from "react";
import { ActionPanel, Action, List, environment, Icon } from "@raycast/api";

export default function Tetris() {
  // Utility functions
  let generateNewGrid = () =>
    Array(22)
      .fill()
      .map(() => Array(10).fill(0));
  let rotate = {
    cw: (matrix) => matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse()),
    ccw: (matrix) => matrix[0].map((val, index) => matrix.map((row) => row[row.length - 1 - index])),
  };

  // useEffect(() => setGame(), [piece, board]) -> useEffect(() => setMarkdown(), [game]) -> Renders `markdown`

  const Status = {
    PLAYING: "playing",
    PAUSED: "paused",
    LOSE: "lose",
  };

  let levelG = [
    0, // Level 0 doesn't exist...
  ];
  for (let i = 1; i <= 15; i++) {
    levelG.push(Math.round((0.05 + ((i - 1) * (0.25 - 0.05)) / 14) * 100) / 100);
  }

  let pieces = [
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [1, 1],
      [1, 1],
    ],
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
  ];

  let bag = useRef(JSON.parse(JSON.stringify(pieces)));

  useEffect(() => {
    for (let i = bag.current.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bag.current[i], bag.current[j]] = [bag.current[j], bag.current[i]];
    }
  }, []);

  // Just the pieces that have already been placed (no current piece)
  // Uses ref to update through setTimeout
  let board = useRef(generateNewGrid());

  let generatePiece = () => {
    let newPiece = bag.current.shift();
    if (bag.current.length === 1) {
      let newBag = JSON.parse(JSON.stringify(pieces));
      for (let i = newBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
      }
      bag.current = newBag;
    }
    return {
      x: newPiece.length === 2 ? 4 : 3,
      y: 0,
      shape: newPiece,
    };
  };

  // A object that stores data about the current piece
  let [piece, setPiece] = useState(() => generatePiece());

  // A completely combined 20x10 matrix of everything in the game
  let [game, setGame] = useState(generateNewGrid());

  // Actual markdown
  let [markdown, setMarkdown] = useState("");

  let speed = useRef(200);

  let [points, setPoints] = useState(0);
  let [lines, setLines] = useState(0);
  let [level, setLevel] = useState(15);
  let status = useRef(Status.PLAYING);

  useEffect(() => {
    setLevel(Math.floor(lines / 10) + 1);
  }, [points]);

  useEffect(() => {
    let frameRate = 60;
    let millisecondsPerCell = 1000 / (levelG[level] * frameRate);
    speed.current = millisecondsPerCell;
  }, [level]);

  let [startTime, setStartTime] = useState(0);
  useEffect(() => {
    setTimeout(() => {
      tick();
    }, speed.current);
    setStartTime(Date.now());
  }, []);

  let handleLineClear = () => {
    let matrix = board.current;
    let lines = 0;
    for (let i = 0; i < matrix.length; i++) {
      if (matrix[i].every((x) => x === 1)) {
        matrix.splice(i, 1);
        matrix.unshift(new Array(10).fill(0));
        lines++;
      }
    }
    setLines((prevLines) => (prevLines += lines));
    switch (lines) {
      case 1:
        setPoints((pts) => pts + 100 * level);
        break;
      case 2:
        setPoints((pts) => pts + 300 * level);
        break;
      case 3:
        setPoints((pts) => pts + 500 * level);
        break;
      case 4:
        setPoints((pts) => pts + 800 * level);
        break;
      default:
        break;
    }
  };
  let [isTicking, setTicking] = useState(true);

  let tick = () => {
    if (status.current === Status.PLAYING) {
      setTicking(true);
      setPiece((original) => {
        if (!hasCollision({ ...original, y: original.y + 1 })) {
          let newPiece = JSON.parse(JSON.stringify(original));
          newPiece.y++;
          return newPiece;
        } else {
          if (original.y === 0) {
            if (environment.textSize === "medium") {
              setMarkdown(`
  \`\`\`       
  │                    │
  │                    │
  │                    │
  │                    │
  │                    │
  │                    │
  │                    │
  │                    │
  │                    │
  │        GAME        │    PRESS ENTER
  │        OVER        │    TO RESTART
  │                    │
  │                    │
  │                    │
  │                    │
  │                    │
  │                    │
  │                    │
  │                    │
  │                    │ 
  \`\`\`
              `);
            } else {
              setMarkdown(`
  \`\`\`
  
  │          │
  │          │
  │          │
  │          │
  │   GAME   │   PRESS ENTER
  │   OVER   │   TO RESTART
  │          │
  │          │
  │          │
  │          │
  ╰──TETRIS──╯
  \`\`\`
              `);
            }
            status.current = Status.LOSE;
            return original;
          } else {
            let newBoard = JSON.parse(JSON.stringify(board.current));
            let { x, y, shape } = original;
            for (let i = 0; i < shape.length; i++) {
              for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j] !== 0 && newBoard[y + i]) {
                  newBoard[y + i][x + j] = shape[i][j];
                }
              }
            }
            board.current = newBoard;
            let newPiece = generatePiece();

            handleLineClear();
            return newPiece;
          }
        }
      });
    }
    if (status.current === Status.PLAYING) {
      setTimeout(() => {
        tick();
      }, speed.current);
    } else {
      setTicking(false);
    }
  };

  useEffect(() => {
    if (status.current === Status.PLAYING && !isTicking) {
      tick();
    }
  }, [status.current]);

  let hasCollision = (checkPiece = piece) => {
    let { shape, x, y } = checkPiece;
    for (let i = 0; i < shape.length; i++) {
      for (let j = 0; j < shape[0].length; j++) {
        // Only need to check collision if there's actually something on the piece model!
        if (shape[i][j] !== 0) {
          let newI = y + i;
          let newJ = x + j;
          if (
            board.current[newI] !== undefined &&
            board.current[newI][newJ] !== undefined &&
            board.current[newI][newJ] === 0
          ) {
            // Can move piece!
          } else {
            return true;
          }
        }
      }
    }
    return false;
  };

  function convertToMmSs(milliseconds) {
    var totalSeconds = Math.floor(milliseconds / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    var mmss = (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
    return mmss;
  }

  let generateMarkdown = () => {
    if (environment.textSize === "medium") {
      let result = [];
      for (let i = 1; i < game.length; i += 1) {
        let current = "";
        for (let j = 0; j < game[i].length; j++) {
          current += game[i][j] === 0 ? "  " : "██";
        }
        if (i === 0) {
          result.push([" " + current + " "]);
        } else if (i === 3) {
          result.push(["│" + current + `│ NEXT:`]);
        } else if (i === 9) {
          result.push(["│" + current + `│ LVL:    ${level} `]);
        } else if (i === 10) {
          result.push(["│" + current + `│ TIME:   ${convertToMmSs(Date.now() - startTime)}`]);
        } else if (i === 11) {
          result.push(["│" + current + `│ LINES:  ${String(lines).padStart(6, "0")}`]);
        } else if (i === 12) {
          result.push(["│" + current + `│ POINTS: ${String(points).padStart(6, "0")} `]);
        } else {
          result.push(["│" + current + "│"]);
        }
      }
      // result += "╰───────TETRIS───────╯\n";

      let nextPiece = structuredClone(bag.current[0]);
      if (nextPiece.length === 3) nextPiece.push(new Array(nextPiece[0].length).fill(0));

      for (let i = 0; i < nextPiece.length; i++) {
        result[i + 3] += " ";
        for (let j = 0; j < nextPiece[i].length; j++) {
          result[i + 3] += nextPiece[i][j] === 1 ? "██" : "  ";
        }
      }

      return result.join("\n") + "\n";
    } else {
      let result = [];
      for (let i = 0; i < game.length / 2; i += 1) {
        let matrixSlice = game.slice(i * 2, i * 2 + 2);
        let current = "";
        for (let j = 0; j < game[0].length; j++) {
          let blocks = {
            "00": " ",
            "01": "▄",
            10: "▀",
            11: "█",
          };
          let blockType = [matrixSlice[0][j], matrixSlice[1][j]].join("");
          current += blocks[blockType];
        }
        if (i === 0) {
          result.push([" " + current + ""]);
        } else if (i === 1) {
          result.push(["│" + current + "│ NEXT:"]);
        } else if (i === 7) {
          result.push(["│" + current + `│ LVL:    ${level}`]);
        } else if (i === 8) {
          result.push(["│" + current + `│ TIME:   ${convertToMmSs(Date.now() - startTime)}`]);
        } else if (i === 9) {
          result.push(["│" + current + `│ LINES:  ${String(lines).padStart(6, "0")}`]);
        } else if (i === 10) {
          result.push(["│" + current + `│ POINTS: ${String(points).padStart(6, "0")}`]);
        } else {
          result.push(["│" + current + "│"]);
        }
      }

      let nextPiece = structuredClone(bag.current[0]);
      if (nextPiece.length === 3) nextPiece.push(new Array(nextPiece[0].length).fill(0));

      for (let i = 0; i < nextPiece.length / 2; i++) {
        result[i + 2] += " ";
        let pieceSlice = nextPiece.slice(i * 2, i * 2 + 2);
        for (let j = 0; j < nextPiece[i].length; j++) {
          let blocks = {
            "00": " ",
            "01": "▄",
            10: "▀",
            11: "█",
          };
          let blockType = [pieceSlice[0][j], pieceSlice[1][j]].join("");

          result[i + 2] += blocks[blockType];
        }
      }

      result.push("╰──TETRIS──╯");
      return result.join("\n") + "\n";
    }
  };

  useEffect(() => {
    let newGame = JSON.parse(JSON.stringify(board.current));
    let { x, y, shape } = piece;
    for (let i = 0; i < shape.length; i++) {
      for (let j = 0; j < shape[0].length; j++) {
        if (shape[i][j] !== 0) {
          newGame[y + i][x + j] = shape[i][j];
        }
      }
    }
    setGame(newGame);
  }, [piece, board]);

  useEffect(() => {
    setMarkdown((prevMarkdown) => `\`\`\`${generateMarkdown(prevMarkdown)}\`\`\``);
  }, [game]);

  let handleKeyDown = (key) => {
    switch (key) {
      case "d":
        setPiece((original) => {
          if (!hasCollision({ ...original, x: original.x + 1 })) {
            let newPiece = JSON.parse(JSON.stringify(original));
            newPiece.x++;
            return newPiece;
          }
          return original;
        });
        break;
      case "a":
        setPiece((original) => {
          if (!hasCollision({ ...original, x: original.x - 1 })) {
            let newPiece = JSON.parse(JSON.stringify(original));
            newPiece.x--;
            return newPiece;
          }
          return original;
        });
        break;
      case "w":
        setPiece((original) => {
          if (!hasCollision({ ...original, shape: rotate.cw(original.shape) })) {
            let newPiece = JSON.parse(JSON.stringify(original));
            newPiece.shape = rotate.cw(original.shape);
            return newPiece;
          }
          return original;
        });
        break;
      case "s":
        setPiece((original) => {
          if (!hasCollision({ ...original, y: original.y + 1 })) {
            let newPiece = JSON.parse(JSON.stringify(original));
            newPiece.y += 1;
            return newPiece;
          }
          return original;
        });
        break;
      case " ":
        setPiece((original) => {
          let dy = 0;
          while (!hasCollision({ ...original, y: original.y + dy })) {
            dy += 1;
          }
          let newPiece = JSON.parse(JSON.stringify(original));
          newPiece.y += dy - 1;
          return newPiece;
        });
        break;
      default:
        return;
    }
  };

  let [selectedTab, setSelectedTab] = useState("game");

  return (
    <List
      searchText=""
      searchBarPlaceholder="Focus your cursor here..."
      onSearchTextChange={(key) => {
        handleKeyDown(key);
      }}
      isShowingDetail={true}
      selectedItemId={selectedTab}
      onSelectionChange={(id) => {
        setSelectedTab(id);
        if (id === "help") {
          status.current = Status.PAUSED;
        }
        if (id === "game") {
          status.current = Status.PLAYING;
        }
      }}
    >
      <List.Item
        title="Tetris"
        id="game"
        icon={Icon.Play}
        detail={<List.Item.Detail markdown={markdown} />}
        actions={
          <ActionPanel>
            <Action
              title={status.current === Status.PLAYING ? "Pause" : "Restart"}
              icon={status.current === Status.PLAYING ? Icon.Pause : Icon.RotateClockwise}
              onAction={() => {
                if (status.current === Status.PLAYING) {
                  setSelectedTab("help");
                  status.current = Status.PAUSED;
                } else {
                  status.current = Status.PLAYING;
                  board.current = generateNewGrid();
                  setPiece(generatePiece());
                  setGame(generateNewGrid());
                  setPoints(0);
                  setLines(0);
                  setStartTime(Date.now());
                  setLevel(1);
                }
              }}
            />
            <Action
              icon={Icon.ArrowLeft}
              title="Move Piece Left"
              shortcut={{ modifiers: ["shift"], key: "a" }}
              onAction={() => handleKeyDown("a")}
            />
            <Action
              icon={Icon.ArrowRight}
              title="Move Piece Right"
              shortcut={{ modifiers: ["shift"], key: "d" }}
              onAction={() => handleKeyDown("d")}
            />
            <Action
              icon={Icon.ArrowDown}
              title="Move Piece Down"
              shortcut={{ modifiers: ["shift"], key: "s" }}
              onAction={() => handleKeyDown("s")}
            />
            <Action
              icon={Icon.RotateClockwise}
              title="Rotate Piece"
              shortcut={{ modifiers: ["shift"], key: "w" }}
              onAction={() => handleKeyDown("w")}
            />
          </ActionPanel>
        }
      ></List.Item>
      <List.Item
        icon={Icon.Pause}
        title="Help / Pause"
        id="help"
        detail={
          <List.Item.Detail
            markdown={`# Game Paused\nPress enter to return to the game.${
              environment.textSize === "large"
                ? "\n > Large text size detected. You may want to use the Small text size for a larger Tetris board."
                : ""
            }\n# Controls\nAfter focusing your cursor in the top search box, simply use WASD and Space to navigate the piece.\n- Using \`A\`/\`D\` moves the piece left or right\n- Using \`W\` rotates the piece clockwise\n- Using \`S\` moves the piece down\n- Space drops the piece completely.\n> Key repeats are disabled by default on MacOS. You can either turn them on, or hold \`Shift\` with the respective control to enable repeat.\n# Rules\n If you do not know how to play Tetris, read about it on Wikipedia [here](https://en.wikipedia.org/wiki/Tetris).`}
          />
        }
        actions={
          <ActionPanel>
            <Action
              icon={Icon.Play}
              title="Unpause"
              onAction={() => {
                setSelectedTab("game");
                status.current = Status.PLAYING;
              }}
            />
          </ActionPanel>
        }
      ></List.Item>
    </List>
  );
}
