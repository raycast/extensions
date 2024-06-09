import { ActionPanel, Action, Grid } from "@raycast/api";
import { Cell } from "../game";

export const FlagComponent = (props: {
  handleFlag: (row: number, col: number) => void;
  row: number;
  col: number;
  item: Cell;
}) => {
  const { handleFlag, row, col, item } = props;
  return (
    <Grid.Item
      content={item.state.toString()}
      key={`${row}, ${col}`}
      actions={
        <ActionPanel>
          <Action title="Remove Flag" onAction={() => handleFlag(row, col)} />
        </ActionPanel>
      }
    />
  );
};

export const UnopenedComponent = (props: {
  handleFlag: (row: number, col: number) => void;
  handleOpen: (row: number, col: number) => void;
  row: number;
  col: number;
  item: Cell;
}) => {
  const { handleFlag, handleOpen, row, col, item } = props;
  return (
    <Grid.Item
      content={{ color: item.state.toString() }}
      key={`${row}, ${col}`}
      actions={
        <ActionPanel>
          <Action title="Open Cell" onAction={() => handleOpen(row, col)} />
          <Action title="Set Flag" onAction={() => handleFlag(row, col)} />
        </ActionPanel>
      }
    />
  );
};

export const WinLoseComponent = (props: { item: Cell; row: number; col: number }) => {
  const { item, row, col } = props;
  return <Grid.Item content={{ color: item.state.toString() }} key={`${row}, ${col}`} />;
};

export const OpenedComponent = (props: {
  handleOpen: (row: number, col: number) => void;
  item: Cell;
  row: number;
  col: number;
}) => {
  const { handleOpen, item, row, col } = props;
  return (
    <Grid.Item
      content={typeof item.state == "number" ? getSymbol(item.state) : { color: item.state.toString() }}
      key={`${row},${col}`}
      actions={
        <ActionPanel>
          <Action title="Open Around" onAction={() => handleOpen(row, col)} />
        </ActionPanel>
      }
    />
  );
};

// a string is not an ImageLike, so we have to use an emoji
function getSymbol(x: number): string {
  // NOT THE REAL NUMBER !!
  // THE RETURN VALUE IS AN EMOJI OF THE NUMBER
  // IF YOU DO toString() IT WILL NOT SHOW UP IN RAYCAST
  // LINK TO THE EMOJIS IF YOU NEED THEM: https://emojipedia.org/search?q=digit%20
  switch (x) {
    case 0: {
      return ""; // an empty square
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
      return "";
    }
  }
}
