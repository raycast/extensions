import { Action, Icon } from "@raycast/api";
import { Shortcuts } from "../../constants/shortcuts";
import { useTasksContext, TasksProvider } from "../../contexts/TasksContext";
import { ClickUpTask } from "../../types/clickup";
import { SubtasksList } from "../tasks/SubtasksList";
import { TaskDetail } from "../tasks/TaskDetail";

interface TaskActionProps {
  task: ClickUpTask;
}

export function ShowTaskDetails({ task }: TaskActionProps) {
  const { tasks } = useTasksContext();
  return (
    <Action.Push
      target={
        <TasksProvider tasks={tasks}>
          <TaskDetail task={task} />
        </TasksProvider>
      }
      title="Show Task Details"
    />
  );
}

export function GoToParentTask({ task: parentTask }: TaskActionProps) {
  const { tasks } = useTasksContext();
  return (
    <Action.Push
      icon={Icon.ArrowUp}
      shortcut={Shortcuts.GoToParentTask}
      target={
        <TasksProvider tasks={tasks}>
          <TaskDetail task={parentTask} />
        </TasksProvider>
      }
      title="Go to Parent Task"
    />
  );
}

export function ShowSubtasks({ task }: TaskActionProps) {
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
