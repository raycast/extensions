import { getClient } from "./client";
import type { NotificationStatus } from "../domain/notification";
import type { NotificationThread } from "../types/api";

export type ListNotificationParams = {
  all?: boolean;
  statusTypes?: NotificationStatus[];
  limit?: number;
  page?: number;
};
export async function listNotifications(params: ListNotificationParams = {}): Promise<NotificationThread[]> {
  const client = getClient();
  const { limit = 20, all = false, page, statusTypes } = params;
  const { data, error } = await client.GET("/notifications", {
    params: {
      query: { limit, all, ...(page ? { page } : {}), ...(statusTypes ? { "status-types": statusTypes } : {}) },
    },
  });
  if (error) throw new Error("Failed to fetch notifications");
  return data ?? [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const client = getClient();
  const { data, error } = await client.GET("/notifications/new");
  if (error) throw new Error("Failed to fetch unread notification count");
  return data?.new ?? 0;
}

export type UpdateNotificationsParams = { id: string; toStatus: NotificationStatus };
export async function updateNotificationStatus(params: UpdateNotificationsParams): Promise<void> {
  const client = getClient();
  const { data, error } = await client.PATCH("/notifications/threads/{id}", {
    params: { path: { id: params.id }, query: { "to-status": params.toStatus } },
  });
  if (error) throw new Error("Failed to update notification status");
  return data;
}

/**
 * Update the status of all notifications to read.
 * Defaults to filtering by unread status-type and setting to-status to read.
 */
export async function readAllNotificationStatus(...statusTypes: NotificationStatus[]) {
  const client = getClient();
  const { data, error } = await client.PUT("/notifications", {
    params: {
      query: {
        "to-status": "read",
        ...(statusTypes.length > 0 ? { "status-types": statusTypes } : {}),
      },
    },
  });
  if (error) throw new Error("Failed to update notifications");
  return data ?? [];
}
