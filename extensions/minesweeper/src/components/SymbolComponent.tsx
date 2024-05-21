import { ActionPanel, Grid } from "@raycast/api";
import { OpenAction, FlagAction } from "../sweep";
import { Cell, CellState, Game } from "../game";

export const SymbolComponent = (props: { game: Game; row: number; col: number; item: Cell; }) => {
  const { game, row, col, item } = props;
  const symbol = typeof item.state === "number" ? get_symbol(item.state) : item.state.toString();
  return (
    <Grid.Item
      content={symbol.toString()}
      key={`${row}-${col}`}
      actions={<ActionPanel>
        <OpenAction game={game} row={row} col={col} />
        <FlagAction game={game} row={row} col={col} />
      </ActionPanel>} />
  );
};

// a string is not an ImageLike, so we have to use an emoji
export function get_symbol(x: number): string {
  // NOT THE REAL NUMBER !!
  // THE RETURN VALUE IS AN EMOJI OF THE NUMBER
  // IF YOU DO toString() IT WILL NOT SHOW UP IN RAYCAST
  // BEWARE
  // LINK TO THE EMOJIS IF YOU NEED THEM: https://emojipedia.org/search?q=digit%20
  switch (x) {
    case 0: {
      return CellState.Revealed;
    }
    case 1: {
      return "1️";
    }
    case 2: {
      return "2️";
    }
    case 3: {
      return "3️";
    }
    case 4: {
      return "4️";
    }
    case 5: {
      return "5️";
    }
    case 6: {
      return "6️";
    }
    case 7: {
      return "7️";
    }
    case 8: {
      return "8️";
    }
    default: {
      return CellState.Revealed;
    }
  }
}
