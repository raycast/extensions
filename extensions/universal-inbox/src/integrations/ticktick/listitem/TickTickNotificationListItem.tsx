import { NotificationTaskActions } from "../../../action/NotificationTaskActions";
import { TickTickTaskPreview } from "../preview/TickTickTaskPreview";
import { NotificationListItemProps } from "../../../notification";
import { Icon, List, Color } from "@raycast/api";
import { TaskPriority } from "../../../task";
import { match } from "ts-pattern";
import dayjs from "dayjs";

export function TickTickNotificationListItem({ notification, mutate }: NotificationListItemProps) {
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
      icon={Icon.CheckCircle}
      subtitle={subtitle}
      accessories={accessories}
      actions={
        <NotificationTaskActions
          notification={notification}
          detailsTarget={<TickTickTaskPreview notification={notification} />}
          mutate={mutate}
        />
      }
    />
  );
}
