import { PreviewDetail } from "../../../preview/PreviewDetail";
import { TaskMetadata } from "../../../preview/TaskMetadata";
import { Notification } from "../../../notification";

interface TodoistTaskPreviewProps {
  notification: Notification;
}

export function TodoistTaskPreview({ notification }: TodoistTaskPreviewProps) {
  const task = notification.task;
  const title = task?.title ?? notification.title;

  let markdown = `# ${title}`;
  if (task?.body) {
    markdown += `\n\n${task.body}`;
  }

  return (
    <PreviewDetail
      notification={notification}
      markdown={markdown}
      metadata={task ? <TaskMetadata task={task} /> : undefined}
    />
  );
}
