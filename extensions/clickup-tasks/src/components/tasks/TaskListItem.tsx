import { ActionPanel, Color, Icon, List } from "@raycast/api";
import { useTasksContext } from "../../contexts/TasksContext";
import { ClickUpTask } from "../../types/clickup";
import { ListItemProps } from "../../types/raycast";
import { buildSubtitle, buildTaskAccessories } from "../../utils/format-helpers";
import { countSubtasks, getParentTask, hasSubtasks, isSubtask } from "../../utils/task-helpers";
import { CopyBody, CopyId, CopyMarkdownUrl, CopyUrl } from "../actions/CopyActions";
import { ShowTaskDetails, GoToParentTask, ShowSubtasks } from "../actions/NavigationActions";
import { OpenInClickUp } from "../actions/OpenInClickUp";
import { NextStatus, ChangeStatus } from "../actions/StatusActions";

interface Props {
  task: ClickUpTask;
}

export function TaskListItem({ task }: Props) {
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

  const iconValue: ListItemProps["icon"] = isSubTask
    ? { source: Icon.Minus, tintColor: Color.SecondaryText }
    : task.priority
      ? { source: Icon.Flag, tintColor: task.priority.color }
      : undefined;

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
      icon={iconValue}
      key={task.id}
      keywords={keywords}
      subtitle={subtitle}
      title={task.name}
    />
  );
}
