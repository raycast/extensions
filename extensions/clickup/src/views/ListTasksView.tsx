import { List, Icon, Color, ActionPanel } from "@raycast/api";
import { useMemo } from "react";
import { TasksProvider, useTasksContext } from "../contexts/TasksContext";
import { useTasks } from "../hooks/useTasks";
import { ClickUpList, ClickUpTask } from "../types/clickup";
import { flattenTasksWithDepth } from "../utils/task-helpers";
import { buildTaskAccessories, buildSubtitle } from "../utils/format-helpers";
import { hasSubtasks, countSubtasks, getParentTask, isSubtask } from "../utils/task-helpers";
import { CopyBody, CopyId, CopyMarkdownUrl, CopyUrl } from "../components/actions/CopyActions";
import { ShowTaskDetails, GoToParentTask, ShowSubtasks } from "../components/actions/NavigationActions";
import { OpenInClickUpAction } from "../components/OpenInClickUpAction";
import { NextStatus, ChangeStatus } from "../components/actions/StatusActions";

interface Props {
  list: ClickUpList;
}

export function ListTasksView({ list }: Props) {
  const { error, isLoading, tasks } = useTasks({ listId: list.id });
  const tasksWithDepth = useMemo(() => flattenTasksWithDepth(tasks), [tasks]);

  if (error && !isLoading && tasks.length === 0) {
    return (
      <List>
        <List.EmptyView description={error.message} icon={Icon.ExclamationMark} title="Failed to load tasks" />
      </List>
    );
  }

  return (
    <TasksProvider tasks={tasks}>
      <List isLoading={isLoading} navigationTitle={list.name} searchBarPlaceholder="Search tasks...">
        {tasks.length === 0 && !isLoading && (
          <List.EmptyView description="This list has no tasks" icon={Icon.CheckCircle} title="No tasks" />
        )}
        {tasksWithDepth.map(({ depth, task }) => (
          <TaskListItem depth={depth} key={task.id} task={task} />
        ))}
      </List>
    </TasksProvider>
  );
}

interface TaskListItemProps {
  depth?: number;
  task: ClickUpTask;
}

function TaskListItem({ depth = 0, task }: TaskListItemProps) {
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
        ? { source: Icon.Flag, tintColor: task.priority.color }
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
