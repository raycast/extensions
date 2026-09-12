import { List, Icon, Color, ActionPanel } from "@raycast/api";
import { useMemo } from "react";
import { TasksProvider, useTasksContext } from "./contexts/TasksContext";
import { useMyTasks } from "./hooks/useMyTasks";
import { ClickUpTask } from "./types/clickup";
import { flattenTasksWithDepthAndContext } from "./utils/task-helpers";
import { buildTaskAccessories, buildSubtitle } from "./utils/format-helpers";
import { hasSubtasks, countSubtasks, getParentTask, isSubtask } from "./utils/task-helpers";
import { CopyBody, CopyId, CopyMarkdownUrl, CopyUrl } from "./components/actions/CopyActions";
import { ShowTaskDetails, GoToParentTask, ShowSubtasks } from "./components/actions/NavigationActions";
import { OpenInClickUpAction } from "./components/OpenInClickUpAction";
import { NextStatus, ChangeStatus } from "./components/actions/StatusActions";

export default function MyTasks() {
  const { assignedTaskIds, error, isLoading, tasks, userName } = useMyTasks();

  const tasksWithContext = useMemo(
    () => flattenTasksWithDepthAndContext(tasks, assignedTaskIds),
    [tasks, assignedTaskIds],
  );

  if (error && !isLoading && tasks.length === 0) {
    return (
      <List>
        <List.EmptyView description={error.message} icon={Icon.ExclamationMark} title="Failed to load tasks" />
      </List>
    );
  }

  return (
    <TasksProvider tasks={tasks}>
      <List isLoading={isLoading} navigationTitle={userName ? `My Tasks - ${userName}` : "My Tasks"}>
        {tasks.length === 0 && !isLoading && (
          <List.EmptyView
            description="You don't have any tasks assigned to you"
            icon={Icon.CheckCircle}
            title="No tasks assigned to you"
          />
        )}
        {tasksWithContext.map(({ depth, isAssignedToUser, task }) => (
          <TaskListItem depth={depth} isAssignedToUser={isAssignedToUser} key={task.id} task={task} />
        ))}
      </List>
    </TasksProvider>
  );
}

interface TaskListItemProps {
  depth?: number;
  isAssignedToUser?: boolean;
  task: ClickUpTask;
}

function TaskListItem({ depth = 0, isAssignedToUser = true, task }: TaskListItemProps) {
  const { tasks: allTasks } = useTasksContext();
  const isSubTask = isSubtask(task);
  const parentTask = isSubTask ? getParentTask(task, allTasks) : undefined;
  const subtaskCount = hasSubtasks(task, allTasks) ? countSubtasks(task, allTasks) : 0;
  const accessories = buildTaskAccessories(task);
  const subtitle = buildSubtitle(subtaskCount);
  const markdownUrl = `[${task.name}](${task.url})`;

  const keywords = [
    ...(task.watchers ? task.watchers.map((w) => w.username) : []),
    ...task.assignees.map((a) => a.username),
    ...task.tags.map((t) => t.name),
    task.creator.username,
    task.name,
    task.priority?.priority || "",
    task.status.status,
  ].filter(Boolean);

  const iconValue =
    depth === 0
      ? task.priority
        ? {
            source: Icon.Flag,
            tintColor: isAssignedToUser ? task.priority.color : Color.SecondaryText,
          }
        : undefined
      : depth === 1
        ? { source: Icon.Minus, tintColor: Color.SecondaryText }
        : { source: Icon.ChevronRight, tintColor: Color.SecondaryText };

  const indentation = "  ".repeat(depth);
  const displayTitle = `${indentation}${task.name}`;

  let markdown = `# ${task.name}`;
  if (task.description) {
    markdown += `\n\n${task.description}`;
  }

  return (
    <List.Item
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <ShowTaskDetails task={task} />
            {isSubTask && parentTask && <GoToParentTask task={parentTask} />}
            {subtaskCount > 0 && <ShowSubtasks task={task} />}
            <OpenInClickUpAction route={task.url} override />
          </ActionPanel.Section>
          <ActionPanel.Section title="Status">
            <NextStatus task={task} />
            <ChangeStatus task={task} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyBody content={markdown} />
            <CopyMarkdownUrl url={markdownUrl} />
            <CopyUrl url={task.url} />
            <CopyId id={task.id} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      icon={iconValue}
      keywords={keywords}
      subtitle={subtitle}
      title={displayTitle}
    />
  );
}
