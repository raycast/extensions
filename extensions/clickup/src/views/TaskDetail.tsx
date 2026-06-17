import { Detail, ActionPanel, Icon } from "@raycast/api";
import { useTasksContext } from "../contexts/TasksContext";
import { ClickUpTask } from "../types/clickup";
import { OpenInClickUpAction } from "../components/OpenInClickUpAction";
import { CopyBody, CopyId, CopyMarkdownUrl, CopyUrl } from "../components/actions/CopyActions";
import { GoToParentTask, ShowSubtasks } from "../components/actions/NavigationActions";
import { NextStatus, ChangeStatus } from "../components/actions/StatusActions";
import { formatDate, formatUser, getStatusDisplay, getPriorityDisplay, pluralize } from "../utils/format-helpers";
import { hasSubtasks, countSubtasks, getParentTask, isSubtask } from "../utils/task-helpers";

interface Props {
  task: ClickUpTask;
}

export function TaskDetail({ task }: Props) {
  const { tasks: allTasks } = useTasksContext();
  const isSubTask = isSubtask(task);
  const parentTask = isSubTask ? getParentTask(task, allTasks) : undefined;
  const subtaskCount = hasSubtasks(task, allTasks) ? countSubtasks(task, allTasks) : 0;
  const markdownUrl = `[${task.name}](${task.url})`;

  let markdown = `# ${task.name}`;
  if (task.description) {
    markdown += `\n\n${task.description}`;
  }

  const statusDisplay = getStatusDisplay(task.status);
  const priorityDisplay = getPriorityDisplay(task.priority);
  const creatorDisplay = formatUser(task.creator);

  return (
    <Detail
      navigationTitle={task.name}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <OpenInClickUpAction route={task.url} override />
            {isSubTask && parentTask && <GoToParentTask task={parentTask} />}
            {subtaskCount > 0 && <ShowSubtasks task={task} />}
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
      metadata={
        <Detail.Metadata>
          {parentTask && <Detail.Metadata.Link target={parentTask.url} text={parentTask.name} title="Parent Task" />}
          {subtaskCount > 0 && (
            <Detail.Metadata.Label
              icon={Icon.List}
              text={`${subtaskCount} ${pluralize(subtaskCount, "subtask")}`}
              title="Subtasks"
            />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item color={statusDisplay.color} text={statusDisplay.text} />
          </Detail.Metadata.TagList>
          {priorityDisplay.text && (
            <Detail.Metadata.TagList title="Priority">
              <Detail.Metadata.TagList.Item
                color={priorityDisplay.color}
                icon={priorityDisplay.icon}
                text={priorityDisplay.text}
              />
            </Detail.Metadata.TagList>
          )}
          {task.assignees.length > 0 && (
            <Detail.Metadata.TagList title="Assignees">
              {task.assignees.map((assignee) => {
                const display = formatUser(assignee);
                return <Detail.Metadata.TagList.Item key={assignee.id} text={display.text} />;
              })}
            </Detail.Metadata.TagList>
          )}
          {task.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {task.tags.map((tag) => (
                <Detail.Metadata.TagList.Item color={tag.tag_bg} key={tag.name} text={tag.name} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          {task.due_date && <Detail.Metadata.Label text={formatDate(task.due_date)} title="Due Date" />}
          <Detail.Metadata.Label text={formatDate(task.date_created)} title="Created" />
          <Detail.Metadata.Label text={formatDate(task.date_updated)} title="Updated" />
          <Detail.Metadata.Label icon={creatorDisplay.icon} text={creatorDisplay.text} title="Creator" />
        </Detail.Metadata>
      }
    />
  );
}
