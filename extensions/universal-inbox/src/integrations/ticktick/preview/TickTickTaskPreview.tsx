import { PreviewDetail } from "../../../preview/PreviewDetail";
import { TaskMetadata } from "../../../preview/TaskMetadata";
import { Notification } from "../../../notification";
import { TickTickTaskStatus } from "../types";

interface TickTickTaskPreviewProps {
  notification: Notification;
}

export function TickTickTaskPreview({ notification }: TickTickTaskPreviewProps) {
  const task = notification.task;
  const item =
    notification.source_item.data.type === "TickTickItem" ? notification.source_item.data.content : undefined;
  const title = task?.title ?? notification.title;

  let markdown = `# ${title}`;
  if (task?.body) {
    markdown += `\n\n${task.body}`;
  }
  if (item?.items?.length) {
    const checklist = item.items
      .map((entry) => `- [${entry.status === TickTickTaskStatus.Completed ? "x" : " "}] ${entry.title}`)
      .join("\n");
    markdown += `\n\n## Checklist\n\n${checklist}`;
  }

  return (
    <PreviewDetail
      notification={notification}
      markdown={markdown}
      metadata={task ? <TaskMetadata task={task} /> : undefined}
    />
  );
}
