import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { katoApi } from "./api";
import { ErrorActions } from "./error-actions";
import { NotificationActions } from "./notification-actions";
import { accessTokenOptions } from "./oauth";
import type { KatoNotification, NotificationCategory } from "./types";

const CATEGORIES: Array<{ id: NotificationCategory; title: string }> = [
  { id: "mentions", title: "Mentions" },
  { id: "assigned", title: "Assigned to You" },
  { id: "task_updates", title: "Task Updates" },
  { id: "record_activity", title: "Record Activity" },
  { id: "other", title: "Other" },
];

type Status = "all" | "unread" | "read";

function relativeDate(value: string) {
  const elapsed = Date.now() - Date.parse(value);
  const minutes = Math.max(1, Math.floor(elapsed / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function KatoNotificationsCommand() {
  const [status, setStatus] = useState<Status>("unread");
  const [notifications, setNotifications] = useState<KatoNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  async function load() {
    setIsLoading(true);
    setError(undefined);
    try {
      setNotifications(await katoApi.notifications(status));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not load notifications",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => void load(), [status]);

  const sections = useMemo(
    () =>
      Object.fromEntries(
        CATEGORIES.map((category) => [
          category.id,
          notifications.filter((item) => item.category === category.id),
        ]),
      ) as Record<NotificationCategory, KatoNotification[]>,
    [notifications],
  );

  function markReadLocally(notification: KatoNotification) {
    setNotifications((current) =>
      status === "unread"
        ? current.filter((item) => item.id !== notification.id)
        : current.map((item) =>
            item.id === notification.id ? { ...item, isRead: true } : item,
          ),
    );
  }

  function markUnreadLocally(notification: KatoNotification) {
    setNotifications((current) => {
      if (status === "read")
        return current.filter((item) => item.id !== notification.id);
      if (current.some((item) => item.id === notification.id)) {
        return current.map((item) =>
          item.id === notification.id ? { ...item, isRead: false } : item,
        );
      }
      return [{ ...notification, isRead: false }, ...current];
    });
  }

  async function markAllRead() {
    const previous = notifications;
    setNotifications((current) =>
      status === "unread"
        ? []
        : current.map((item) => ({ ...item, isRead: true })),
    );
    try {
      const marked = await katoApi.markAllNotificationsRead();
      await showToast({
        style: Toast.Style.Success,
        title:
          marked === 1
            ? "1 notification marked read"
            : `${marked} notifications marked read`,
      });
    } catch (cause) {
      setNotifications(previous);
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not mark notifications read",
        message: (cause as Error).message,
      });
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Filter notifications…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Notification status"
          value={status}
          onChange={(value) => setStatus(value as Status)}
        >
          <List.Dropdown.Item title="Unread" value="unread" />
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Read" value="read" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          title="Could not load notifications"
          description={error}
          icon={Icon.Warning}
          actions={
            <ErrorActions command="notifications" onRetry={() => void load()} />
          }
        />
      ) : null}
      {!error && !isLoading && notifications.length === 0 ? (
        <List.EmptyView
          title={
            status === "unread" ? "You’re all caught up" : "No notifications"
          }
          description={
            status === "unread"
              ? "There are no unread Kato notifications."
              : undefined
          }
          icon={Icon.CheckCircle}
        />
      ) : null}
      {CATEGORIES.map((category) =>
        sections[category.id].length ? (
          <List.Section
            key={category.id}
            title={category.title}
            subtitle={String(sections[category.id].length)}
          >
            {sections[category.id].map((notification) => (
              <List.Item
                key={notification.id}
                icon={{
                  source: notification.isRead ? Icon.Circle : Icon.Dot,
                  tintColor: notification.isRead
                    ? Color.SecondaryText
                    : Color.Blue,
                }}
                title={notification.title}
                subtitle={notification.actor?.name ?? undefined}
                accessories={[{ text: relativeDate(notification.createdAt) }]}
                detail={
                  <List.Item.Detail
                    markdown={notification.body || "_No additional details_"}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label
                          title="Category"
                          text={category.title}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="When"
                          text={new Date(
                            notification.createdAt,
                          ).toLocaleString()}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Status"
                          text={notification.isRead ? "Read" : "Unread"}
                        />
                        {notification.webUrl ? (
                          <List.Item.Detail.Metadata.Link
                            title="Kato"
                            text="Open related item"
                            target={notification.webUrl}
                          />
                        ) : null}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <NotificationActions
                    notification={notification}
                    onRead={() => markReadLocally(notification)}
                    onUnread={() => markUnreadLocally(notification)}
                    onDismissed={() =>
                      setNotifications((current) =>
                        current.filter((item) => item.id !== notification.id),
                      )
                    }
                    onMarkAllRead={markAllRead}
                  />
                }
              />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}

export default withAccessToken(accessTokenOptions)(KatoNotificationsCommand);
