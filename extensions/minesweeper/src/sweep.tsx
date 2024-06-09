import { Grid } from "@raycast/api";
import { useEffect, useState } from "react";
import Game, { CellState } from "./game";
import { FlagComponent, UnopenedComponent, WinLoseComponent, OpenedComponent } from "./components/CellComponents";

export default function Command() {
  const gameDefault = new Game();
  const [game, setGame] = useState<Game>(gameDefault);
  console.log("calling command");

  useEffect(() => {
    const gameDefault = new Game();
    gameDefault.init();
    setGame(gameDefault);
  }, []);

  const handleOpen = (row: number, col: number) => {
    const updatedGame = game.open(row, col);
    setGame(updatedGame);
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
            return <OpenedComponent handleOpen={handleOpen} item={item} row={i} col={j} />;
          }
          if (type === CellState.Flag) {
            return <FlagComponent handleFlag={handleFlag} row={i} col={j} item={item} />;
          }
          if (type === CellState.Grey) {
            return <UnopenedComponent handleFlag={handleFlag} handleOpen={handleOpen} row={i} col={j} item={item} />;
          }
          if (type === CellState.Lost || type === CellState.Won) {
            return <WinLoseComponent item={item} row={i} col={j} />;
          }
        });
      })}
    </Grid>
  );
}
