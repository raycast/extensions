import { NotificationTaskActions } from "../../../action/NotificationTaskActions";
import { TodoistTaskPreview } from "../preview/TodoistTaskPreview";
import { NotificationListItemProps } from "../../../notification";
import { Icon, List, Color } from "@raycast/api";
import { TaskPriority } from "../../../task";
import { match } from "ts-pattern";
import dayjs from "dayjs";

export function TodoistNotificationListItem({ notification, mutate }: NotificationListItemProps) {
  const dueAt = notification.task?.due_at?.content;
  const subtitle = dueAt ? dayjs(dueAt).format("YYYY-MM-DD") : undefined;

  const color = match(notification)
    .with({ task: { priority: TaskPriority.P1 } }, () => Color.Red)
    .with({ task: { priority: TaskPriority.P2 } }, () => Color.Orange)
    .with({ task: { priority: TaskPriority.P3 } }, () => Color.Yellow)
    .otherwise(() => null);

  const accessories: List.Item.Accessory[] = [
    {
      icon: { source: Icon.Circle, tintColor: color },
    },
    {
      date: new Date(notification.updated_at),
      tooltip: `Updated at ${notification.updated_at}`,
    },
  ];

  const task = notification.task;
  if (task) {
    for (const tag of task.tags) {
      accessories.unshift({ tag: { value: tag } });
    }
  }

  return (
    <List.Item
      key={notification.id}
      title={notification.title}
      icon={{ source: { light: "todoist-logo-dark.svg", dark: "todoist-logo-light.svg" } }}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <NotificationTaskActions
          notification={notification}
          detailsTarget={<TodoistTaskPreview notification={notification} />}
          mutate={mutate}
        />
      }
    />
  );
}
