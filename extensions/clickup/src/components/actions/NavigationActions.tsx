import { Action, Icon } from "@raycast/api";

import { Shortcuts } from "../../constants/shortcuts";
import { TasksProvider, useTasksContext } from "../../contexts/TasksContext";
import type { ClickUpTask } from "../../types/clickup";
import { SubtasksList } from "../tasks/SubtasksList";
import { TaskDetail } from "../tasks/TaskDetail";

interface Props {
  task: ClickUpTask;
}

export function ShowTaskDetails({ task }: Props) {
  const { tasks, updateTaskStatus } = useTasksContext();
  return (
    <Action.Push
      target={
        <TasksProvider tasks={tasks} updateTaskStatus={updateTaskStatus}>
          <TaskDetail task={task} />
        </TasksProvider>
      }
      title="Show Task Details"
    />
  );
}

export function GoToParentTask({ task: parentTask }: Props) {
  const { tasks, updateTaskStatus } = useTasksContext();
  return (
    <Action.Push
      icon={Icon.ArrowUp}
      shortcut={Shortcuts.GoToParentTask}
      target={
        <TasksProvider tasks={tasks} updateTaskStatus={updateTaskStatus}>
          <TaskDetail task={parentTask} />
        </TasksProvider>
      }
      title="Go to Parent Task"
    />
  );
}

export function ShowSubtasks({ task }: Props) {
  const { tasks, updateTaskStatus } = useTasksContext();
  return (
    <Action.Push
      icon={Icon.List}
      shortcut={Shortcuts.ShowSubtasks}
      target={
        <TasksProvider tasks={tasks} updateTaskStatus={updateTaskStatus}>
          <SubtasksList parentTask={task} />
        </TasksProvider>
      }
      title="Show Subtasks"
    />
  );
}
