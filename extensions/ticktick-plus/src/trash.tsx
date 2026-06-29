import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getTrashTasks, restoreFromTrash } from "./api/ticktick";
import { useAlerts } from "./hooks/useAlerts";
import { useSync } from "./hooks/useSync";

export default function Trash() {
  useAlerts();
  const { data: syncData } = useSync();

  const {
    data: trash,
    isLoading,
    revalidate,
  } = useCachedPromise(getTrashTasks, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Failed to load trash" },
  });

  const tasks = trash ?? [];
  const projectMap = new Map(syncData.projects.map((p) => [p.id, p.name]));

  return (
    <List isLoading={isLoading} navigationTitle="Trash" searchBarPlaceholder="Search deleted tasks...">
      {tasks.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Trash} title="Trash is empty" />
      ) : (
        <List.Section title={`Deleted · ${tasks.length}`}>
          {tasks.map((task) => (
            <List.Item
              key={task.id}
              icon={Icon.Trash}
              title={task.title}
              subtitle={projectMap.get(task.projectId)}
              actions={
                <ActionPanel>
                  <Action
                    title="Restore Task"
                    icon={Icon.ArrowCounterClockwise}
                    onAction={async () => {
                      try {
                        await restoreFromTrash(task.id, task.projectId);
                        await showToast({ style: Toast.Style.Success, title: "Task restored" });
                        revalidate();
                      } catch (err) {
                        await showToast({ style: Toast.Style.Failure, title: "Failed", message: String(err) });
                      }
                    }}
                  />
                  <Action.OpenInBrowser
                    title="Open in TickTick"
                    url={`https://ticktick.com/webapp/#p/${task.projectId}/tasks/${task.id}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
