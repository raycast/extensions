import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { TrelloResultModel } from "./trelloResponse.model";
import { JSX } from "react";

interface TodoListItemProps {
  result: TrelloResultModel;
}

export const TodoListItem = ({ result }: TodoListItemProps): JSX.Element => {
  const todo = result;
  let dueDate = "";
  if (todo.due) {
    dueDate = new Date(todo.due).toLocaleDateString();
  }
  return (
    <List.Item
      id={todo.id}
      title={todo.name}
      accessoryTitle={dueDate ?? ""}
      subtitle={todo.desc}
      icon={Icon.Checkmark}
      keywords={todo.labels?.map((label) => label.name)}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Links">
            <Action.OpenInBrowser
              url={todo.url.replace("https", "trello")}
              title="Open in Trello Desktop"
              icon={Icon.Link}
            />
            <Action.OpenInBrowser url={todo.url} title="Open on Trello Web" icon={Icon.Link} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
