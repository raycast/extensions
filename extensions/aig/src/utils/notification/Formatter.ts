import { NotificationInterface, NotificationType } from "models/Notification";

export default class NotificationFormatter {
  private readonly priorityOrder: NotificationType[] = [
    "danger",
    "warning",
    "info",
    "success",
  ];

  public formatTitle(notifications: NotificationInterface[]): string {
    if (notifications.length === 0) return "";
    const highestPriority = this.getHighestPriority(notifications);
    return notifications
      .map(({ title, type, source }) =>
        this.isPriorityHigherOrEqual(
          type.label.toLowerCase() as NotificationType,
          highestPriority,
        )
          ? `${title}${source.icon}`
          : source.icon,
      )
      .join(" ");
  }

  public getIconColor(notifications: NotificationInterface[]): string {
    if (notifications.length === 0) return "default";
    return this.getHighestPriority(notifications).toLowerCase();
  }

  private getHighestPriority(
    notifications: NotificationInterface[],
  ): NotificationType {
    return (
      this.priorityOrder.find((type) =>
        notifications.some(
          (notification) => notification.type.label.toLowerCase() === type,
        ),
      ) || "success"
    );
  }

  private isPriorityHigherOrEqual(
    priority: NotificationType,
    compareTo: NotificationType,
  ): boolean {
    return (
      this.priorityOrder.indexOf(priority) <=
      this.priorityOrder.indexOf(compareTo)
    );
  }
}
