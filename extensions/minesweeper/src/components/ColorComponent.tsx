import { ActionPanel, Grid } from "@raycast/api";
import { OpenAction, FlagAction } from "../sweep";
import { Game, Cell } from "../game";

export const ColorComponent = (props: { game: Game; row: number; col: number; item: Cell; }) => {
  const { game, row, col, item } = props;
  return (
    <Grid.Item
      content={{ color: item.state.toString() }}
      key={`${row}-${col}`}
      actions={<ActionPanel>
        <OpenAction game={game} row={row} col={col} />
        <FlagAction game={game} row={row} col={col} />
      </ActionPanel>} />
  );
};

