import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";

export default function Inbox() {
  useAlerts();
  const { data, isLoading, revalidate } = useSync();
  const inboxTasks = data.tasks.filter((t) => t.projectId === data.inboxId);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter inbox tasks...">
      {!data.inboxId && !isLoading ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not detect Inbox"
          description="TickTick did not return an inbox project via the API."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : inboxTasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="Inbox is empty"
          description="No unorganized tasks."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title={`Inbox · ${inboxTasks.length} task${inboxTasks.length !== 1 ? "s" : ""}`}>
          {inboxTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projects={data.projects}
              onComplete={revalidate}
              onDelete={revalidate}
              onRevalidate={revalidate}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
