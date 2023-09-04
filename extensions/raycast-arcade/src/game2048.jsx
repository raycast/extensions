import { Action, ActionPanel, Toast, showToast, LocalStorage, Icon, Detail, confirmAlert, Alert } from "@raycast/api";
import svg64 from "svg64";
import { useState, useRef, useEffect } from "react";

export default function Game2048() {
  let TEST_BOARD = [
    ["2", "4", "8", "16"],
    ["32", "64", "128", "256"],
    ["512", "1024", "2048", "4096"],
    ["8192", "16384", "32768", "65536"],
  ];

  const Status = {
    PLAYING: "playing",
    GAMEOVER: "gameover",
  };

  let status = useRef(Status.PLAYING);

  let generateEmptyBoard = () =>
    Array(4)
      .fill()
      .map(() =>
        Array(4)
          .fill()
          .map(() => ""),
      );

  let [board, setBoard] = useState(() => {
    let emptyBoard = generateEmptyBoard();
    let [i, j] = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)];
    emptyBoard[i][j] = Math.random() < 0.1 ? "4" : "2";
    return emptyBoard;
  });

  let checkGameOver = (board) => {
    if (board.every((row) => row.every((cell) => cell !== ""))) {
      let gameOver = true;
      for (let i in board) {
        for (let j in board[i]) {
          let diffs = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ];

          for (let [di, dj] of diffs) {
            if (board[parseInt(i) + di] && board[parseInt(i) + di][parseInt(j) + dj] === board[i][j]) {
              gameOver = false;
              break;
            }
          }
        }
      }
      if (gameOver) {
        showToast({
          title: "Game Over",
          style: Toast.Style.Failure,
        });
        status.current = Status.GAMEOVER;
      }
    }
  };

  useEffect(() => {
    (async () => {
      let savedBoard = await LocalStorage.getItem("2048board");

      if (savedBoard) {
        savedBoard = JSON.parse(savedBoard);
        checkGameOver(savedBoard);
        setBoard(savedBoard);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      await LocalStorage.setItem("2048board", JSON.stringify(board));
    })();
  }, [board]);

  let compress = (board) => {
    let hasChanged = false;
    let newBoard = generateEmptyBoard();
    for (let i in newBoard) {
      let pos = 0;
      for (let j in newBoard[i]) {
        if (board[i][j] !== "") {
          newBoard[i][pos] = board[i][j];
          if (pos != j) {
            hasChanged = true;
          }
          pos++;
        }
      }
    }
    return [newBoard, hasChanged];
  };

  let merge = (board) => {
    let hasChanged = false;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 3; j++) {
        if (board[i][j] == board[i][j + 1] && board[i][j] !== "") {
          board[i][j] = String(board[i][j] * 2);
          board[i][j + 1] = "";
          hasChanged = true;
        }
      }
    }
    return [board, hasChanged];
  };

  let generateBoard = (board) => {
    let svg = `
    <svg width="2250" height="1000">
    <rect x="625" y="0" width="1000" height="1000" fill="#BCAC9F" rx="20" />
    `;
    for (let i in board) {
      let row = board[i];
      for (let j in row) {
        let square = row[j];

        let colors = {
          2: {
            tile: "#EEE4DA",
            color: "#776E65",
          },
          4: {
            tile: "#EEDEC9",
            color: "#776E65",
          },
          8: {
            tile: "#F2B178",
            color: "#FFFFFF",
          },
          16: {
            tile: "#EC8E53",
            color: "#FFFFFF",
          },
          32: {
            tile: "#F47D60",
            color: "#FFFFFF",
          },
          64: {
            tile: "#F65E3B",
            color: "#FFFFFF",
          },
          128: {
            tile: "#EDCF72",
            color: "#FFFFFF",
          },
          256: {
            tile: "#F2D04B",
            color: "#FFFFFF",
          },
          512: {
            tile: "#EFC850",
            color: "#FFFFFF",
          },
          1024: {
            tile: "#EDC53F",
            color: "#FFFFFF",
          },
          2048: {
            tile: "#EDC22E",
            color: "#FFFFFF",
          },
        };

        let size = Math.log(square.length) / Math.log(0.96) + 100;

        svg += `
        <rect x="${(30 + 213) * j + 30 + 625}" y="${(30 + 213) * i + 30}" width="213" height="213" fill="#${
          square === "" ? "#CCC1B4" : colors[square]?.tile ?? "#3C3A31"
        }" rx="20" />
        ${
          square !== "" &&
          `
          <text x="${(30 + 213) * j + 30 + 625 + 213 / 2}" y="${
            (30 + 213) * i + 30 + 213 / 2 + size / 2
          }" height="213" width="213" font-size="${size}" fill="#${
            colors[square]?.color ?? "#FFFFFF"
          }" dominant-baseline="middle" text-anchor="middle" startoffset="1" font-family="Helvetica Neue" font-weight="bold">${square}</text>
        `
        }
        `;
      }
    }
    svg += "</svg>";

    return `![](${svg64(svg)})`;
  };

  let addNewTile = (board) => {
    let count = 0;
    let result = null;

    for (let i in board) {
      for (let j in board[i]) {
        if (board[i][j] === "") {
          count++;
          if (Math.random() < 1 / count) result = [i, j];
        }
      }
    }

    if (result !== null) {
      let newBoard = structuredClone(board);
      newBoard[result[0]][result[1]] = Math.random() < 0.1 ? "4" : "2";
      checkGameOver(newBoard);
      return newBoard;
    }
  };

  const replay = () => {
    let newBoard = generateEmptyBoard();
    let [i, j] = [Math.floor(Math.random() * 4), Math.floor(Math.random() * 4)];
    newBoard[i][j] = Math.random() < 0.1 ? "4" : "2";

    setBoard(newBoard);
    status.current = Status.PLAYING;
  };

  const rotateLeft = (matrix) => matrix[0].map((_, i) => matrix.map((row) => row[i])).reverse();
  const rotateRight = (matrix) => matrix[0].map((_, i) => matrix.map((row) => row[i])).map((row) => row.reverse());
  const rotate180 = (matrix) => matrix.map((row) => row.reverse()).reverse();

  let shiftLeft = (previousBoard) => {
    let [compressedBoard, hasChanged1] = compress(previousBoard);
    let [mergedBoard, hasChanged2] = merge(compressedBoard);
    let [newBoard, _] = compress(mergedBoard);

    if (hasChanged1 || hasChanged2) {
      newBoard = addNewTile(newBoard);
    }
    return newBoard;
  };

  let shiftUp = (previousBoard) => rotateRight(shiftLeft(rotateLeft(previousBoard)));

  let shiftDown = (previousBoard) => rotateLeft(shiftLeft(rotateRight(previousBoard)));

  let shiftRight = (previousBoard) => rotate180(shiftLeft(rotate180(previousBoard)));

  return (
    <Detail
      actions={
        <ActionPanel>
          {status.current === Status.GAMEOVER ? (
            <Action title="Replay" onAction={replay} />
          ) : (
            <>
              <Action
                title="Restart"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                onAction={async () => {
                  await confirmAlert({
                    title: "Are you sure you want to restart?",
                    primaryAction: {
                      title: "Restart",
                      style: Alert.ActionStyle.Destructive,
                      onAction: () => {
                        replay();
                      },
                    },
                  });
                }}
              />
              <Action
                title="Shift Left"
                shortcut={{ modifiers: ["shift"], key: "arrowLeft" }}
                icon={Icon.ArrowLeft}
                onAction={() => {
                  setBoard(shiftLeft);
                }}
              />
              <Action
                title="Shift Right"
                shortcut={{ modifiers: ["shift"], key: "arrowRight" }}
                icon={Icon.ArrowRight}
                onAction={() => {
                  setBoard(shiftRight);
                }}
              />
              <Action
                title="Shift Up"
                shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
                icon={Icon.ArrowUp}
                onAction={() => {
                  setBoard(shiftUp);
                }}
              />
              <Action
                title="Shift Down"
                shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
                icon={Icon.ArrowDown}
                onAction={() => {
                  setBoard(shiftDown);
                }}
              />
            </>
          )}
        </ActionPanel>
      }
      markdown={generateBoard(board)}
    />
  );
}
