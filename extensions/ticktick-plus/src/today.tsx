import { List, Icon } from "@raycast/api";
import { format, isToday, parseISO } from "date-fns";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";
import { Task } from "./types/ticktick";

function isTaskDueToday(task: Task): boolean {
  if (!task.dueDate) return false;
  try {
    return isToday(parseISO(task.dueDate));
  } catch {
    return false;
  }
}

export default function Today() {
  useAlerts();
  const { data, isLoading, revalidate } = useSync();
  const todayTasks = data.tasks.filter(isTaskDueToday);
  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));
  const today = format(new Date(), "EEEE, MMMM d");

  return (
    <List isLoading={isLoading} navigationTitle={`Today — ${today}`} searchBarPlaceholder="Filter today's tasks...">
      {todayTasks.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Checkmark} title="All done for today!" description="No tasks due today." />
      ) : (
        <List.Section title={`Today · ${todayTasks.length} task${todayTasks.length !== 1 ? "s" : ""}`}>
          {todayTasks.map((task) => (
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
