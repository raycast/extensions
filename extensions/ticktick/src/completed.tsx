import { withAccessToken } from "@raycast/utils";
import { authorize } from "./api/oauth";
import { getPreferenceValues, List, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { subDays } from "date-fns";
import { getCompletedTasks } from "./api/tasks";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";
import { useSync } from "./hooks/useSync";
import { useFirstRun } from "./lib/useFirstRun";

function Completed() {
  useFirstRun();
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
    { keepPreviousData: true }
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
export default integrationMode === "applescript" ? APIRequired : withAccessToken({ authorize })(Completed);
