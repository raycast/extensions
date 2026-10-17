import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api";
import { NotificationStatus } from "../domain/notification";
import type { NotificationThread } from "../types/api";
import {
  getUnreadNotificationCount,
  getNotifications,
  listUnreadNotifications,
  readAllNotifications,
  updateNotificationStatus,
} from "./notifications";

vi.mock("../api", () => ({
  api: {
    notifications: {
      list: vi.fn(),
      countUnread: vi.fn(),
      readAll: vi.fn(),
      updateStatus: vi.fn(),
    },
  },
}));

const notificationApi = vi.mocked(api.notifications);

function notification(overrides: Partial<NotificationThread>): NotificationThread {
  return overrides as NotificationThread;
}

describe("notification services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wraps listed notifications as a paginated result", async () => {
    const items = [notification({ id: 1 }), notification({ id: 2 })];
    notificationApi.list.mockResolvedValue(items);

    await expect(getNotifications({ limit: 2, page: 3, all: true })).resolves.toEqual({
      items,
      hasMore: true,
    });
    expect(notificationApi.list).toHaveBeenCalledWith({ limit: 2, page: 3, all: true });
  });

  it("does not report more pages when fewer notifications than the limit are returned", async () => {
    const items = [notification({ id: 1 })];
    notificationApi.list.mockResolvedValue(items);

    await expect(getNotifications({ limit: 2 })).resolves.toEqual({
      items,
      hasMore: false,
    });
  });

  it("lists unread notifications with the domain status constant", async () => {
    const items = [notification({ id: 1, unread: true })];
    notificationApi.list.mockResolvedValue(items);

    await expect(listUnreadNotifications()).resolves.toBe(items);
    expect(notificationApi.list).toHaveBeenCalledWith({ statusTypes: [NotificationStatus.Unread] });
  });

  it("gets the unread notification count", async () => {
    notificationApi.countUnread.mockResolvedValue(37);

    await expect(getUnreadNotificationCount()).resolves.toBe(37);
    expect(notificationApi.countUnread).toHaveBeenCalledWith();
  });

  it("forwards notification status updates", async () => {
    notificationApi.updateStatus.mockResolvedValue(undefined);

    await expect(updateNotificationStatus({ id: "42", toStatus: NotificationStatus.Read })).resolves.toBeUndefined();
    expect(notificationApi.updateStatus).toHaveBeenCalledWith({ id: "42", toStatus: NotificationStatus.Read });
  });

  it("forwards read-all status filters", async () => {
    await expect(readAllNotifications(NotificationStatus.Unread, NotificationStatus.Pinned)).resolves.toBeUndefined();
    expect(notificationApi.readAll).toHaveBeenCalledWith(NotificationStatus.Unread, NotificationStatus.Pinned);
  });
});
