import { ActionPanel, Icon, List, Color } from "@raycast/api";
import { useTasksContext } from "../../contexts/TasksContext";
import { ClickUpTask } from "../../types/clickup";
import { OpenInClickUpAction } from "../../components/OpenInClickUpAction";
import { buildTaskAccessories, buildSubtitle } from "../../utils/format-helpers";
import { hasSubtasks, countSubtasks, getParentTask, isSubtask } from "../../utils/task-helpers";
import { CopyBody, CopyId, CopyMarkdownUrl, CopyUrl } from "../../components/actions/CopyActions";
import { ShowTaskDetails, GoToParentTask, ShowSubtasks } from "../../components/actions/NavigationActions";
import { NextStatus, ChangeStatus } from "../../components/actions/StatusActions";

interface Props {
  depth?: number;
  task: ClickUpTask;
}

export function Task({ depth = 0, task }: Props) {
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

  let iconValue;
  if (depth === 0) {
    iconValue = task.priority ? { source: Icon.Flag, tintColor: task.priority.color } : undefined;
  } else if (depth === 1) {
    iconValue = { source: Icon.Minus, tintColor: Color.SecondaryText };
  } else {
    iconValue = { source: Icon.ChevronRight, tintColor: Color.SecondaryText };
  }

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
