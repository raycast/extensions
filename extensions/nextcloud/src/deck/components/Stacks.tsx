import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { formatDistanceToNow, parseISO } from "date-fns";
import { type Card, useStacks } from "../hooks";
import { BASE_URL } from "../../config";

export function Stacks({ boardId, boardName }: { boardId: number; boardName: string }) {
  const { stacks, isLoading } = useStacks(boardId);

  return (
    <List isLoading={isLoading} navigationTitle={`Board: ${boardName}`}>
      {stacks.map((stack) => (
        <List.Section key={stack.id} title={stack.title} subtitle={String(stacks.length)}>
          {stack.cards?.map((card) => (
            <Card key={card.id} card={card} boardId={boardId} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function Card({ card, boardId }: { card: Card; boardId: number }) {
  const cardUrl = `${BASE_URL}/apps/deck/#/board/${boardId}/card/${card.id}`;

  const overdue = card.overdue > 0;
  const dueDate = card.duedate
    ? (overdue ? "Overdue by " : "Due in ") + formatDistanceToNow(parseISO(card.duedate))
    : "";
  const labels =
    card.labels.length > 0
      ? " " +
        card.labels
          .map((label) => {
            return "[" + label.title + "]";
          })
          .join(" ")
      : "";

  return (
    <List.Item
      title={card.title}
      subtitle={card.description + labels}
      icon={{ source: Icon.Circle, tintColor: overdue ? Color.Red : undefined }}
      accessories={[{ text: dueDate }]}
      actions={
        <ActionPanel title={card.title}>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={cardUrl} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
