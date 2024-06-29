import { NotificationInterface, NotificationType } from "models/Notification";

export default class NotificationSorter {
  private readonly priorityOrder: NotificationType[] = [
    "danger",
    "warning",
    "info",
    "success",
  ];

  public sortByPriority(
    notifications: NotificationInterface[],
  ): NotificationInterface[] {
    return [...notifications].sort(
      (a, b) =>
        this.priorityOrder.indexOf(
          a.type.label.toLowerCase() as NotificationType,
        ) -
        this.priorityOrder.indexOf(
          b.type.label.toLowerCase() as NotificationType,
        ),
    );
  }
}
