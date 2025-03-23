import { List, ActionPanel, Action, Icon, Color, Keyboard } from "@raycast/api";
import { Task } from "@doist/todoist-api-typescript";
import { useGetTasks, useGetProject } from "@/hooks/todoist/useTodoist";
import { useMe, useProjects, useRunningTimeEntry } from "./hooks/toggl";
import { startTogglTimer, stopTogglTimer } from "./helpers/togglTimerControl";
import { todoCompleted } from "./helpers/todoTaskControl";
import { useCurrentTime } from "./hooks/toggl/useCurrentTime";
import { sumTaskTimer } from "./helpers/sumTaskTimer";
import CreateTaskForm from "./component/CreateTaskForm";
import UpdateTaskForm from "./component/UpdateTaskForm";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";

dayjs.extend(duration);

export default function Command() {
  const { isLoading, data: tasks, mutate } = useGetTasks();

  const { runningTimeEntry: currentTimer, revalidateRunningTimeEntry: refreshTimer } = useRunningTimeEntry();

  const { data: todoistProjects } = useGetProject();

  const currentTime = useCurrentTime();

  const { projects: togglProjects } = useProjects();

  const { me: meData } = useMe();

  const durationTask = async (task: Task) => {
    sumTaskTimer(task, mutate);
  };

  const getTaskDuration = (task: Task) => {
    const rowTaskDuration = task.duration?.amount ?? 0;
    const textData =
      rowTaskDuration > 0
        ? `${dayjs.duration(rowTaskDuration, "seconds").format("HH:mm:ss")}`
        : "Get duration : cmd + ->";
    return [{ text: textData }];
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Task">
      {currentTimer && (
        <List.Section title="Runnning">
          <List.Item
            title={`${currentTimer.description}`}
            subtitle={dayjs.duration(dayjs(currentTime).diff(currentTimer.start), "milliseconds").format("HH:mm:ss")}
            accessories={[{ text: "Tracking time in toggl" }]}
            icon={{
              source: Icon.Circle,
              tintColor: todoistProjects?.find((project) => project.id === currentTimer.project_id?.toString())?.color,
            }}
            actions={
              <ActionPanel>
                <Action
                  title="Stop Toggl"
                  onAction={() => stopTogglTimer(currentTimer.id, currentTimer.workspace_id, refreshTimer, mutate)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      <List.Section title="Actions">
        <List.Item
          title="Create new task"
          icon="task_command.png"
          actions={
            <ActionPanel>
              <Action.Push
                title="Create Task"
                target={<CreateTaskForm mutate={mutate} refreshTimer={refreshTimer} />}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Tasks">
        {tasks
          ?.sort((a: Task, b: Task) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((task) => (
            <List.Item
              key={task.id}
              title={task.content}
              subtitle={todoistProjects.find((project) => project.id === task.projectId)?.name}
              accessories={getTaskDuration(task)}
              icon={{
                source: Icon.Circle,
                tintColor: todoistProjects?.find((project) => project.id === task.projectId)?.color,
              }}
              actions={
                <ActionPanel>
                  <Action
                    title="Start Toggl"
                    onAction={() => startTogglTimer(task, todoistProjects, meData, togglProjects, refreshTimer)}
                    icon={{ source: Icon.Clock }}
                  />
                  <Action
                    title="Todo Completed"
                    icon={{
                      source: Icon.CheckCircle,
                      tintColor: Color.Green,
                    }}
                    onAction={() => todoCompleted(task, mutate)}
                  />
                  <Action.Push
                    title="Edit Task"
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    icon={{
                      source: Icon.Pencil,
                      tintColor: Color.PrimaryText,
                    }}
                    target={<UpdateTaskForm mutate={mutate} task={task} />}
                  />
                  <Action
                    title="Summary Time Track"
                    shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                    icon={{
                      source: Icon.Calculator,
                      tintColor: Color.Orange,
                    }}
                    onAction={() => durationTask(task)}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
