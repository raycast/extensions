import { List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { subDays } from "date-fns";
import { getCompletedTasks } from "./api/tasks";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";
import { useSync } from "./hooks/useSync";

export default function Completed() {
  useAlerts();
  const { data: syncData } = useSync();

  const {
    data: completed,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const to = new Date();
      const from = subDays(to, 30);
      return getCompletedTasks(from, to);
    },
    [],
    { keepPreviousData: true },
  );

  const tasks = completed ?? [];
  const projectMap = new Map(syncData.projects.map((p) => [p.id, p.name]));

  return (
    <List isLoading={isLoading} navigationTitle="Completed" searchBarPlaceholder="Search completed tasks...">
      {tasks.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Checkmark} title="No completed tasks" description="Last 30 days." />
      ) : (
        <List.Section title={`Completed · ${tasks.length} (last 30 days)`}>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              projects={syncData.projects}
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
