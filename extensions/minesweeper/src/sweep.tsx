import { ActionPanel, Action, Grid, Icon } from "@raycast/api";
import { SymbolComponent } from "./components/SymbolComponent";
import { ColorComponent } from "./components/ColorComponent";
import { Game, CellState } from "./game";

export const BOMB_COUNT: number = 10;
export const SIZE: number = 8;
export const TOTAL_SQUARES: number = SIZE * SIZE;

export default function Command() {
  const game = new Game();
  console.log(game.board);

  return (
    <Grid columns={3} filtering={false} searchBarPlaceholder="disabled">
      <Grid.Item
        key="start"
        content={Icon.Play}
        title="Start"
        actions={
          <ActionPanel>
            <Action.Push title="Start Game" target={<GameLoop game={game} />} />
          </ActionPanel>
        }
      />
    </Grid>
  );
}

function GameLoop(props: { game: Game }) {
  const { game } = props;
  console.log(game.board);
  return (
    <Grid columns={SIZE}>
      {game.board.map((row, i) => {
        return row.map((item, j) => {
          if (
            item.state === CellState.Revealed ||
            item.state === CellState.Grey ||
            item.state === CellState.Lost ||
            item.state === CellState.Won
          ) {
            return <ColorComponent game={game} row={i} col={j} item={item} />;
          }

          return <SymbolComponent game={game} row={i} col={j} item={item} />;
        });
      })}
    </Grid>
  );
}

// actions
export const OpenAction = (props: { game: Game; row: number; col: number }) => {
  const { game, row, col } = props;
  return (
    <Action.Push
      target={<GameLoop game={game} />}
      title="Open"
      onPush={() => {
        console.log("MINES: ", game.getMinesCount(row, col));
        game.open(row, col);
      }}
    />
  );
};
export const FlagAction = (props: { game: Game; row: number; col: number }) => {
  const { game, row, col } = props;
  return (
    <Action.Push
      target={<GameLoop game={game} />}
      title="Flag"
      onPush={() => {
        console.log("flagging,", row, col);
        game.flag(row, col);
      }}
    />
  );
};
