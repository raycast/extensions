import { ActionPanel, Action, Grid, Color } from "@raycast/api";
import { Cell } from "../game";

export const OpenedComponent = (props: {
  handleOpen: (row: number, col: number) => void;
  newGame: () => void;
  item: Cell;
  row: number;
  col: number;
  isOver: boolean;
}) => {
  const { handleOpen, newGame, item, row, col, isOver } = props;
  return (
    <Grid.Item
      content={{
        source: `${item.state}.svg`,
        tintColor: Color.PrimaryText,
      }}
      actions={
        <ActionPanel>
          {isOver ? (
            <Action title="Start New Game" onAction={() => newGame()} />
          ) : (
            <Action title="Open Around" onAction={() => handleOpen(row, col)} />
          )}
        </ActionPanel>
      }
    />
  );
};

export const FlagComponent = (props: {
  handleFlag: (row: number, col: number) => void;
  newGame: () => void;
  row: number;
  col: number;
  item: Cell;
  isOver: boolean;
}) => {
  const { handleFlag, newGame, row, col, item, isOver } = props;
  return (
    <Grid.Item
      content={item.state.toString()}
      actions={
        <ActionPanel>
          {isOver ? (
            <Action title="Start New Game" onAction={() => newGame()} />
          ) : (
            <Action title="Remove Flag" onAction={() => handleFlag(row, col)} />
          )}
        </ActionPanel>
      }
    />
  );
};

export const UnopenedComponent = (props: {
  handleFlag: (row: number, col: number) => void;
  handleOpen: (row: number, col: number) => void;
  newGame: () => void;
  row: number;
  col: number;
  item: Cell;
  isOver: boolean;
}) => {
  const { handleFlag, handleOpen, newGame, row, col, item, isOver } = props;
  return (
    <Grid.Item
      content={{ color: item.state.toString() }}
      actions={
        <ActionPanel>
          {isOver ? (
            <Action title="Start New Game" onAction={() => newGame()} />
          ) : (
            <>
              <Action title="Open Cell" onAction={() => handleOpen(row, col)} />
              <Action title="Set Flag" onAction={() => handleFlag(row, col)} />
            </>
          )}
        </ActionPanel>
      }
    />
  );
};

export const WinLoseComponent = (props: { item: Cell; newGame: () => void }) => {
  const { item, newGame } = props;
  return (
    <Grid.Item
      content={{ color: item.state.toString() }}
      actions={
        <ActionPanel>
          <Action title="Start New Game" onAction={() => newGame()} />
        </ActionPanel>
      }
    />
  );
};
