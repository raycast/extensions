import { Grid } from "@raycast/api";
import { useEffect, useState } from "react";
import Game, { Cell, CellState, SIZE } from "./game";
import { FlagComponent, UnopenedComponent, WinLoseComponent, OpenedComponent } from "./components/CellComponents";

export default function Command() {
  const gameDefault = new Game();
  const [game, setGame] = useState<Game>(gameDefault);
  const [isOver, setIsOver] = useState(false); // used for conditionally rendering cell actions

  useEffect(() => {
    newGame();
  }, []);

  const newGame = () => {
    const gameDefault = new Game();
    gameDefault.init();
    setGame(gameDefault);
    setIsOver(false);
  };

  const showBombs = (board: Cell[][], changeTo: CellState) => {
    const updatedGame = new Game(board, game.actual_board);

    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        if (game.actual_board[i][j].state === CellState.Bomb) {
          updatedGame.board[i][j].state = changeTo;
        }
      }
    }

    setTimeout(() => {
      setGame(updatedGame);
    }, 1000);
  };

  const handleOpen = (row: number, col: number) => {
    const prevBoard = structuredClone(game.board);
    const updatedGame = game.open(row, col);
    setGame(updatedGame);

    const boardState = updatedGame.board[0][0].state;

    if (boardState === CellState.Lost) {
      showBombs(prevBoard, CellState.Bomb);
      setIsOver(true);
    } else if (boardState === CellState.Won) {
      showBombs(prevBoard, CellState.Celebratory);
      setIsOver(true);
    }
  };

  const handleFlag = (row: number, col: number) => {
    const updatedGame = game.flag(row, col);
    setGame(updatedGame);
  };

  return (
    <Grid columns={8} filtering={false}>
      {game.board.map((row, i) => {
        return row.map((item, j) => {
          const type = item.state;

          if (typeof type == "number") {
            return (
              <OpenedComponent
                handleOpen={handleOpen}
                newGame={newGame}
                item={item}
                row={i}
                col={j}
                isOver={isOver}
                key={`${j} ${j}`}
              />
            );
          }
          if (type === CellState.Flag || type === CellState.Bomb || type === CellState.Celebratory) {
            return (
              <FlagComponent
                handleFlag={handleFlag}
                newGame={newGame}
                row={i}
                col={j}
                item={item}
                isOver={isOver}
                key={`${j} ${j}`}
              />
            );
          }
          if (type === CellState.Grey) {
            return (
              <UnopenedComponent
                handleFlag={handleFlag}
                handleOpen={handleOpen}
                newGame={newGame}
                row={i}
                col={j}
                item={item}
                isOver={isOver}
                key={`${j} ${j}`}
              />
            );
          }
          if (type === CellState.Lost || type === CellState.Won) {
            return <WinLoseComponent item={item} newGame={newGame} key={`${i} ${j}`} />;
          }
        });
      })}
    </Grid>
  );
}
