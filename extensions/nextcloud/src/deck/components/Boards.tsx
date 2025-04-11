import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { type Board, useBoards } from "../hooks";
import { Stacks } from "./Stacks";
import { BASE_URL } from "../../config";

export function Boards() {
  const { boards, isLoading } = useBoards();

  return (
    <List isLoading={isLoading}>
      <List.Section title="Boards" subtitle={String(boards.length)}>
        {boards.map((board) => (
          <Board key={board.id} board={board} />
        ))}
      </List.Section>
    </List>
  );
}

function Board({ board }: { board: Board }) {
  const boardUrl = `${BASE_URL}/apps/deck/#/board/${board.id}`;
  const color = board.color;

  return (
    <List.Item
      title={board.title}
      icon={{ source: Icon.Circle, tintColor: color }}
      actions={
        <ActionPanel title={board.title}>
          <ActionPanel.Section>
            <Action.Push
              title="Show Stacks"
              target={<Stacks boardId={board.id} boardName={board.title} />}
              icon={Icon.ArrowRight}
            />
            <Action.OpenInBrowser title="Open in Browser" url={boardUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
