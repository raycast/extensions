import { List, ActionPanel, Icon, Color } from "@raycast/api";
import { useTasksContext } from "../contexts/TasksContext";
import { ClickUpTask } from "../types/clickup";
import { buildTaskAccessories, buildSubtitle } from "../utils/format-helpers";
import { getSubtasks, hasSubtasks, countSubtasks, getParentTask, isSubtask } from "../utils/task-helpers";
import { CopyBody, CopyId, CopyMarkdownUrl, CopyUrl } from "../components/actions/CopyActions";
import { ShowTaskDetails, GoToParentTask, ShowSubtasks } from "../components/actions/NavigationActions";
import { OpenInClickUpAction } from "../components/OpenInClickUpAction";
import { NextStatus, ChangeStatus } from "../components/actions/StatusActions";

interface Props {
  parentTask: ClickUpTask;
}

export function SubtasksList({ parentTask }: Props) {
  const { tasks: allTasks } = useTasksContext();
  const subtasks = getSubtasks(parentTask, allTasks);

  return (
    <List navigationTitle={`Subtasks of ${parentTask.name}`}>
      {subtasks.length === 0 ? (
        <List.EmptyView title="No subtasks" description="This task has no subtasks" />
      ) : (
        subtasks.map((task) => <SubtaskItem key={task.id} task={task} />)
      )}
    </List>
  );
}

interface SubtaskItemProps {
  task: ClickUpTask;
}

function SubtaskItem({ task }: SubtaskItemProps) {
  const { tasks: allTasks } = useTasksContext();
  const isSubTask = isSubtask(task);
  const parentTask = isSubTask ? getParentTask(task, allTasks) : undefined;
  const subtaskCount = hasSubtasks(task, allTasks) ? countSubtasks(task, allTasks) : 0;
  const accessories = buildTaskAccessories(task);
  const subtitle = buildSubtitle(subtaskCount);
  const markdownUrl = `[${task.name}](${task.url})`;

  let markdown = `# ${task.name}`;
  if (task.description) {
    markdown += `\n\n${task.description}`;
  }

  const iconValue = task.priority
    ? { source: Icon.Flag, tintColor: task.priority.color }
    : { source: Icon.Minus, tintColor: Color.SecondaryText };

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
      key={task.id}
      subtitle={subtitle}
      title={task.name}
    />
  );
}
