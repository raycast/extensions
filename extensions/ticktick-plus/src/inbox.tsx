import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";

export default function Inbox() {
  useAlerts();
  const { data, isLoading, revalidate } = useSync();
  const inboxTasks = data.tasks.filter((t) => t.projectId === data.inboxId);

  return (
    <List isLoading={isLoading} navigationTitle="Inbox" searchBarPlaceholder="Filter inbox tasks...">
      {!data.inboxId && !isLoading ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could not detect Inbox"
          description="TickTick did not return an inbox project via the API."
          actions={
            <ActionPanel>
              <Action
                title="Debug: Show Projects"
                onAction={async () => {
                  await showToast({
                    style: Toast.Style.Animated,
                    title: `${data.projects.length} projects`,
                    message: `inboxId=${data.inboxId || "?"}\n${data.projects.map((p) => `${p.name} (${p.id}) [${p.kind ?? "-"}]`).join("\n")}`,
                  });
                }}
              />
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : inboxTasks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Tray}
          title="Inbox is empty"
          description="No unorganised tasks."
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
