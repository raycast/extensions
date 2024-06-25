import { Grid } from "@raycast/api";
import { useEffect, useState } from "react";
import Game, { Cell, CellState, SIZE } from "./game";
import { FlagComponent, UnopenedComponent, WinLoseComponent, OpenedComponent } from "./components/CellComponents";

export default function Command() {
  const gameDefault = new Game();
  const [game, setGame] = useState<Game>(gameDefault);
  const [hasLost, setHasLost] = useState(false); // used for conditionally rendering cell actions

  useEffect(() => {
    const gameDefault = new Game();
    gameDefault.init();
    setGame(gameDefault);
  }, []);

  const showBombs = (board: Cell[][]) => {
    const updatedGame = new Game(board, game.actual_board);

    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        if (game.actual_board[i][j].state === CellState.Bomb) {
          updatedGame.board[i][j].state = CellState.Bomb;
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

    if (updatedGame.board.some((row) => row.some((cell) => cell.state === CellState.Lost))) {
      showBombs(prevBoard);
      setHasLost(true);
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
                item={item}
                row={i}
                col={j}
                hasLost={hasLost}
                key={`${j} ${j}`}
              />
            );
          }
          if (type === CellState.Flag || type === CellState.Bomb) {
            return (
              <FlagComponent handleFlag={handleFlag} row={i} col={j} item={item} hasLost={hasLost} key={`${j} ${j}`} />
            );
          }
          if (type === CellState.Grey) {
            return (
              <UnopenedComponent
                handleFlag={handleFlag}
                handleOpen={handleOpen}
                row={i}
                col={j}
                item={item}
                hasLost={hasLost}
                key={`${j} ${j}`}
              />
            );
          }
          if (type === CellState.Lost || type === CellState.Won) {
            return <WinLoseComponent item={item} key={`${i} ${j}`} />;
          }
        });
      })}
    </Grid>
  );
}
