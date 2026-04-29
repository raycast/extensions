import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { HakunaTimer, Project, Task } from "./hakuna-api";
import { getSettings } from "./settings";
import StartTimerView from "./start-timer-view";
import AddTimeEntry from "./add-time-entry";

interface TaskItemProps {
  task: Task;
  projectId?: string;
  enableTimerActions?: boolean;
}

function TaskItem({ task, projectId, enableTimerActions }: TaskItemProps) {
  const hasActions = projectId !== undefined || enableTimerActions;

  return (
    <List.Item
      title={task.name}
      accessories={task.default ? [{ tag: "Default" }] : []}
      actions={
        hasActions ? (
          <ActionPanel>
            <Action.Push
              title="Start Timer"
              icon={Icon.Play}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
              target={
                <StartTimerView
                  projectId={projectId}
                  taskId={String(task.id)}
                />
              }
            />
            <Action.Push
              title="Add Entry"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              target={
                <AddTimeEntry projectId={projectId} taskId={String(task.id)} />
              }
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

export function ProjectTasks({ project }: { project: Project }) {
  const active = project.tasks.filter((t) => !t.archived);
  const archived = project.tasks.filter((t) => t.archived);

  return (
    <List navigationTitle={project.name}>
      {active.length > 0 && (
        <List.Section title="Active">
          {active.map((t) => (
            <TaskItem key={t.id} task={t} projectId={String(project.id)} />
          ))}
        </List.Section>
      )}
      {archived.length > 0 && (
        <List.Section title="Archived">
          {archived.map((t) => (
            <TaskItem key={t.id} task={t} projectId={String(project.id)} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default function Command() {
  const { apiToken } = getSettings();

  const { data, isLoading } = useCachedPromise(
    async (token: string) => {
      const api = new HakunaTimer(token);
      const [company, allTasks] = await Promise.all([
        api.getCompany(),
        api.getTasks(),
      ]);
      return { projectsEnabled: company.projects_enabled, tasks: allTasks };
    },
    [apiToken],
    {
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load tasks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      },
    },
  );

  const enableTimerActions = data?.projectsEnabled === false;
  const tasks = data?.tasks ?? [];
  const active = tasks.filter((t) => !t.archived);
  const archived = tasks.filter((t) => t.archived);

  return (
    <List isLoading={isLoading} navigationTitle="Tasks">
      {active.length > 0 && (
        <List.Section title="Active">
          {active.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              enableTimerActions={enableTimerActions}
            />
          ))}
        </List.Section>
      )}
      {archived.length > 0 && (
        <List.Section title="Archived">
          {archived.map((t) => (
            <TaskItem
              key={t.id}
              task={t}
              enableTimerActions={enableTimerActions}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
