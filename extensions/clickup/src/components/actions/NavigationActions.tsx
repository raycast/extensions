import { Action, Icon } from "@raycast/api";
import { Shortcuts } from "../../constants/shortcuts";
import { TasksProvider, useTasksContext } from "../../contexts/TasksContext";
import { ClickUpTask } from "../../types/clickup";
import { TaskDetail } from "../../views/TaskDetail";
import { SubtasksList } from "../../views/SubtasksList";

interface Props {
  task: ClickUpTask;
}

export function ShowTaskDetails({ task }: Props) {
  const { tasks } = useTasksContext();
  return (
    <Action.Push
      icon={Icon.Sidebar}
      target={
        <TasksProvider tasks={tasks}>
          <TaskDetail task={task} />
        </TasksProvider>
      }
      title="Show Details"
    />
  );
}

export function GoToParentTask({ task }: Props) {
  const { tasks } = useTasksContext();
  return (
    <Action.Push
      icon={Icon.ArrowUp}
      shortcut={Shortcuts.GoToParentTask}
      target={
        <TasksProvider tasks={tasks}>
          <TaskDetail task={task} />
        </TasksProvider>
      }
      title="Go to Parent Task"
    />
  );
}

export function ShowSubtasks({ task }: Props) {
  const { tasks } = useTasksContext();
  return (
    <Action.Push
      icon={Icon.List}
      shortcut={Shortcuts.ShowSubtasks}
      target={
        <TasksProvider tasks={tasks}>
          <SubtasksList parentTask={task} />
        </TasksProvider>
      }
      title="Show Subtasks"
    />
  );
}
