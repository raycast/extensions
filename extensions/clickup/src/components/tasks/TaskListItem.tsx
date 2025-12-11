import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { useMemo } from "react";

import { useTasksContext } from "../../contexts/TasksContext";
import type { ClickUpTask } from "../../types/clickup";
import type { ListItemProps } from "../../types/raycast";
import { buildSubtitle, buildTaskAccessories } from "../../utils/format-helpers";
import { countSubtasks, getParentTask, hasSubtasks, isSubtask } from "../../utils/task-helpers";
import { CopyBody, CopyId, CopyMarkdownUrl, CopyUrl } from "../actions/CopyActions";
import { GoToParentTask, ShowSubtasks, ShowTaskDetails } from "../actions/NavigationActions";
import { OpenInClickUp } from "../actions/OpenInClickUp";
import { ChangeStatus, NextStatus } from "../actions/StatusActions";

interface Props {
  depth?: number;
  isAssignedToUser?: boolean;
  task: ClickUpTask;
}

export function TaskListItem({ depth = 0, isAssignedToUser = true, task: initialTask }: Props) {
  const { tasks: allTasks } = useTasksContext();
  const task = allTasks.find((t) => t.id === initialTask.id) ?? initialTask;
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

  const icon = useMemo((): ListItemProps["icon"] => {
    if (depth === 0) {
      if (!task.priority) return undefined;
      return {
        source: Icon.Flag,
        tintColor: isAssignedToUser ? task.priority.color : Color.SecondaryText,
      };
    }
    return {
      source: depth === 1 ? Icon.Minus : Icon.ChevronRight,
      tintColor: Color.SecondaryText,
    };
  }, [depth, isAssignedToUser, task.priority]);

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
            <OpenInClickUp url={task.url} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Status">
            <NextStatus task={task} />
            <ChangeStatus task={task} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyBody content={markdown} />
            <CopyMarkdownUrl content={markdownUrl} />
            <CopyUrl url={task.url} />
            <CopyId id={task.id} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      icon={icon}
      key={task.id}
      keywords={keywords}
      subtitle={subtitle}
      title={displayTitle}
    />
  );
}
