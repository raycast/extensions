import { List, ActionPanel, Action } from "@raycast/api";
import { BasecampProject } from "../utils/types";
import TodoListsList from "./TodoListsList";

interface DockItemsListProps {
  accountId: string;
  project: BasecampProject;
}

export function DockItemsList({ accountId, project }: DockItemsListProps) {
  const enabledDockItems = project.dock.filter((item) => item.enabled && item.name === "todoset");

  return (
    <List navigationTitle={project.name}>
      {enabledDockItems.map((item) => (
        <List.Item
          key={item.id}
          title={item.title}
          subtitle={item.name}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Todo Lists"
                target={
                  <TodoListsList
                    accountId={accountId}
                    projectId={project.id}
                    todosetId={item.id}
                    projectName={project.name}
                  />
                }
              />
              <Action.OpenInBrowser title="Open in Browser" url={item.app_url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
