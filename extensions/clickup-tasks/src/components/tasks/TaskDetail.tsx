import { Detail, ActionPanel } from "@raycast/api";
import { useTasksContext } from "../../contexts/TasksContext";
import { ClickUpTask } from "../../types/clickup";
import { formatDate, formatUser, getPriorityDisplay, getStatusDisplay, pluralize } from "../../utils/format-helpers";
import { isSubtask, getParentTask, countSubtasks } from "../../utils/task-helpers";
import { CopyBody, CopyId, CopyMarkdownUrl, CopyUrl } from "../actions/CopyActions";
import { GoToParentTask, ShowSubtasks } from "../actions/NavigationActions";
import { OpenInClickUp } from "../actions/OpenInClickUp";
import { NextStatus, ChangeStatus } from "../actions/StatusActions";

interface Props {
  task: ClickUpTask;
}

export function TaskDetail({ task }: Props) {
  const { tasks: allTasks } = useTasksContext();
  const isSubTask = isSubtask(task);
  const parentTask = isSubTask ? getParentTask(task, allTasks) : undefined;
  const subtaskCount = countSubtasks(task, allTasks);

  let markdown = `# ${task.name}`;
  if (task.description) {
    markdown += `\n\n${task.description}`;
  }

  const markdownUrl = `[${task.name}](${task.url})`;

  const status = getStatusDisplay(task.status);
  const priority = getPriorityDisplay(task.priority);
  const creator = formatUser(task.creator);

  return (
    <Detail
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <OpenInClickUp isDefault url={task.url} />
            {isSubTask && parentTask && <GoToParentTask task={parentTask} />}
            {subtaskCount > 0 && <ShowSubtasks task={task} />}
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
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          {isSubTask && parentTask && (
            <>
              <Detail.Metadata.Link target={parentTask.url} text={parentTask.name} title="Parent Task" />
              <Detail.Metadata.Separator />
            </>
          )}

          {subtaskCount > 0 && (
            <>
              <Detail.Metadata.Label text={String(subtaskCount)} title="Subtasks" />
              <Detail.Metadata.Separator />
            </>
          )}

          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item color={status.color} text={status.text} />
          </Detail.Metadata.TagList>

          <Detail.Metadata.TagList title="Priority">
            <Detail.Metadata.TagList.Item color={priority.color} icon={priority.icon} text={priority.text} />
          </Detail.Metadata.TagList>

          {task.assignees.length > 0 && (
            <Detail.Metadata.TagList title={pluralize(task.assignees.length, "Assignee")}>
              {task.assignees.map((assignee) => (
                <Detail.Metadata.TagList.Item key={assignee.id} {...formatUser(assignee)} />
              ))}
            </Detail.Metadata.TagList>
          )}

          {task.tags.length > 0 && (
            <Detail.Metadata.TagList title={pluralize(task.tags.length, "Tag")}>
              {task.tags.map((tag) => (
                <Detail.Metadata.TagList.Item color={tag.tag_bg} key={tag.name} text={tag.name} />
              ))}
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.Separator />

          {task.due_date && <Detail.Metadata.Label text={formatDate(task.due_date)} title="Due Date" />}

          <Detail.Metadata.Label text={formatDate(task.date_created)} title="Created" />

          <Detail.Metadata.Label text={formatDate(task.date_updated)} title="Updated" />

          <Detail.Metadata.Label title="Creator" {...creator} />

          <Detail.Metadata.Separator />

          <Detail.Metadata.Link target={task.url} text={task.id} title="Open in ClickUp" />
        </Detail.Metadata>
      }
    />
  );
}
