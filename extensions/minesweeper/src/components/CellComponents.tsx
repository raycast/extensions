import { ActionPanel, Action, Grid, Color } from "@raycast/api";
import { Cell } from "../game";

export const OpenedComponent = (props: {
  handleOpen: (row: number, col: number) => void;
  item: Cell;
  row: number;
  col: number;
  hasLost: boolean;
}) => {
  const { handleOpen, item, row, col, hasLost } = props;
  return (
    <Grid.Item
      content={{
        source: `${item.state}.svg`,
        tintColor: Color.PrimaryText,
      }}
      actions={
        hasLost ? (
          <></>
        ) : (
          <ActionPanel>
            <Action title="Open Around" onAction={() => handleOpen(row, col)} />
          </ActionPanel>
        )
      }
    />
  );
};

export const FlagComponent = (props: {
  handleFlag: (row: number, col: number) => void;
  row: number;
  col: number;
  item: Cell;
  hasLost: boolean;
}) => {
  const { handleFlag, row, col, item, hasLost } = props;
  return (
    <Grid.Item
      content={item.state.toString()}
      actions={
        hasLost ? (
          <></>
        ) : (
          <ActionPanel>
            <Action title="Remove Flag" onAction={() => handleFlag(row, col)} />
          </ActionPanel>
        )
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
  hasLost: boolean;
}) => {
  const { handleFlag, handleOpen, row, col, item, hasLost } = props;
  return (
    <Grid.Item
      content={{ color: item.state.toString() }}
      actions={
        hasLost ? (
          <></>
        ) : (
          <ActionPanel>
            <Action title="Open Cell" onAction={() => handleOpen(row, col)} />
            <Action title="Set Flag" onAction={() => handleFlag(row, col)} />
          </ActionPanel>
        )
      }
    />
  );
};

export const WinLoseComponent = (props: { item: Cell }) => {
  const { item } = props;
  return <Grid.Item content={{ color: item.state.toString() }} />;
};
