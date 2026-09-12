import { api } from "../api";
import type { ListNotificationParams, UpdateNotificationsParams } from "../api/notifications";
import { NotificationStatus } from "../domain/notification";
import type { PaginatedResult } from ".";
import type { NotificationThread } from "../types/api";

export async function getNotifications(
  params: ListNotificationParams = {},
): Promise<PaginatedResult<NotificationThread>> {
  const items = await api.notifications.list(params);
  return { items, hasMore: typeof params.limit === "number" && items.length === params.limit };
}

export async function listUnreadNotifications(): Promise<NotificationThread[]> {
  return api.notifications.list({ statusTypes: [NotificationStatus.Unread] });
}

export async function getUnreadNotificationCount(): Promise<number> {
  return api.notifications.countUnread();
}

export async function updateNotificationStatus(params: UpdateNotificationsParams): Promise<void> {
  return api.notifications.updateStatus(params);
}

export async function readAllNotifications(...statusTypes: NotificationStatus[]) {
  return api.notifications.readAll(...statusTypes);
}
