import { Action, ActionPanel, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { api, workspaceId } from "./api";

type Task = {
  id: string;
  identifier: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: number;
  project?: string;
  url: string;
};

export default function MyTasks() {
  const { data, isLoading, revalidate } = useCachedPromise(async () =>
    api<Task[]>("tasks/mine", { workspaceId: await workspaceId() }),
  );
  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter your active tasks…"
    >
      {data?.map((task) => (
        <List.Item
          key={task.id}
          title={task.title}
          subtitle={task.identifier}
          accessories={[
            { text: task.status },
            { text: task.priority },
            ...(task.project ? [{ text: task.project }] : []),
            ...(task.dueDate ? [{ date: new Date(task.dueDate) }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open in Alabasta" url={task.url} />
              <Action.CopyToClipboard
                title="Copy Alabasta Link"
                content={task.url}
              />
              <Action title="Refresh" onAction={revalidate} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
