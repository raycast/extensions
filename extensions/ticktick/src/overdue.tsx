import { withAccessToken } from "@raycast/utils";
import { authorize } from "./api/oauth";
import { getPreferenceValues, List, Icon } from "@raycast/api";
import { isBefore, startOfToday, parseISO } from "date-fns";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";
import { Task } from "./types/ticktick";
import { useFirstRun } from "./lib/useFirstRun";

function isOverdue(task: Task): boolean {
  if (!task.dueDate) return false;
  try {
    return isBefore(parseISO(task.dueDate), startOfToday());
  } catch {
    return false;
  }
}

function Overdue() {
  useFirstRun();
  useAlerts();
  const { data, isLoading, revalidate } = useSync();
  const overdueTasks = data.tasks.filter(isOverdue).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));

  return (
    <List isLoading={isLoading} navigationTitle="Overdue" searchBarPlaceholder="Filter overdue tasks...">
      {overdueTasks.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Checkmark} title="Nothing overdue!" description="You're all caught up." />
      ) : (
        <List.Section title={`Overdue · ${overdueTasks.length} task${overdueTasks.length !== 1 ? "s" : ""}`}>
          {overdueTasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projects={data.projects}
              projectName={projectMap.get(task.projectId)}
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

const { integrationMode } = getPreferenceValues<{ integrationMode: string }>();
function APIRequired() {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Lock}
        title="API Mode Required"
        description="Switch to API mode in TickTick extension preferences (Raycast Settings → Extensions → TickTick) to use this feature."
      />
    </List>
  );
}
export default integrationMode === "applescript" ? APIRequired : withAccessToken({ authorize })(Overdue);
