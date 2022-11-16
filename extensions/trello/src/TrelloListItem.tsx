import { List, Icon, ActionPanel, OpenInBrowserAction } from "@raycast/api";
import { TrelloResultModel } from "./trelloResponse.model";

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
            <OpenInBrowserAction url={todo.url} title="Open on Trello" icon={Icon.Link} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
