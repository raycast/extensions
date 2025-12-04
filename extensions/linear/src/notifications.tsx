import { ActionPanel, Action, List, showToast, Toast, Icon, launchCommand, LaunchType, Keyboard } from "@raycast/api";
import { format } from "date-fns";

import { deleteNotification as linearDeleteNotification } from "./api/deleteNotification";
import { NotificationResult } from "./api/getNotifications";
import { updateNotification } from "./api/updateNotification";
import IssueDetail from "./components/IssueDetail";
import OpenInLinear from "./components/OpenInLinear";
import View from "./components/View";
import { getBotIcon } from "./helpers/bots";
import { getErrorMessage } from "./helpers/errors";
import { getNotificationIcon, getNotificationURL } from "./helpers/notifications";
import { getUserIcon } from "./helpers/users";
import useMe from "./hooks/useMe";
import useNotifications from "./hooks/useNotifications";
import usePriorities from "./hooks/usePriorities";

function Notifications() {
  const {
    urlKey,
    readNotifications,
    unreadNotifications,
    notificationsError,
    isLoadingNotifications,
    mutateNotifications,
  } = useNotifications();

  const { priorities, isLoadingPriorities } = usePriorities();
  const { me, isLoadingMe } = useMe();

  const inboxUrl = `https://linear.app/${urlKey}/inbox`;

  if (notificationsError) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed to fetch latest notifications",
      message: getErrorMessage(notificationsError),
    });
  }

  const sections = [
    { title: "Unread", notifications: unreadNotifications },
    { title: "Read", notifications: readNotifications },
  ];

  async function markAsRead(notification: NotificationResult) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Marking as read" });

      await mutateNotifications(updateNotification({ id: notification.id, readAt: new Date() }), {
        optimisticUpdate(data) {
          if (!data) {
            return data;
          }
          return {
            ...data,
            notifications: data?.notifications?.map((x) =>
              x.id === notification.id ? { ...x, readAt: new Date() } : x,
            ),
          };
        },
        rollbackOnError(data) {
          if (!data) {
            return data;
          }
          return {
            ...data,
            notifications: data?.notifications?.map((x) =>
              x.id === notification.id ? { ...x, readAt: notification.readAt } : x,
            ),
          };
        },
        shouldRevalidateAfter: true,
      });

      await showToast({ style: Toast.Style.Success, title: "Marked as read" });
      await launchCommand({ name: "unread-notifications", type: LaunchType.Background });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to mark notification as read",
        message: getErrorMessage(error),
      });
    }
  }

  async function markAsUnread(notification: NotificationResult) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Marking as unread" });

      await mutateNotifications(updateNotification({ id: notification.id, readAt: null }), {
        optimisticUpdate(data) {
          if (!data) {
            return data;
          }
          return {
            ...data,
            notifications: data?.notifications?.map((x) =>
              x.id === notification.id ? { ...x, readAt: undefined } : x,
            ),
          };
        },
        rollbackOnError(data) {
          if (!data) {
            return data;
          }
          return {
            ...data,
            notifications: data?.notifications?.map((x) =>
              x.id === notification.id ? { ...x, readAt: notification.readAt } : x,
            ),
          };
        },
        shouldRevalidateAfter: true,
      });

      await showToast({ style: Toast.Style.Success, title: "Marked as unread" });
      await launchCommand({ name: "unread-notifications", type: LaunchType.Background });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to mark notification as unread",
        message: getErrorMessage(error),
      });
    }
  }

  async function deleteNotification(notification: NotificationResult) {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Deleting notification" });

      await mutateNotifications(linearDeleteNotification(notification.id), {
        optimisticUpdate(data) {
          if (!data) {
            return data;
          }
          return {
            ...data,
            notifications: data?.notifications?.filter((x) => x.id !== notification.id),
          };
        },
        rollbackOnError(data) {
          if (!data) {
            return data;
          }
          return {
            ...data,
            notifications: data?.notifications?.concat([notification]),
          };
        },
      });

      await showToast({ style: Toast.Style.Success, title: "Deleted notification" });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete notification",
        message: getErrorMessage(error),
      });
    }
  }

  async function markAllAsRead() {
    if (unreadNotifications.length === 0) {
      await showToast({ style: Toast.Style.Success, title: "No unread notifications" });
      return;
    }

    try {
      await showToast({
        style: Toast.Style.Animated,
        title: `Marking ${unreadNotifications.length} notification${unreadNotifications.length === 1 ? "" : "s"} as read`,
      });

      const readAt = new Date();

      await mutateNotifications(
        Promise.all(unreadNotifications.map((notification) => updateNotification({ id: notification.id, readAt }))),
        {
          optimisticUpdate(data) {
            if (!data) {
              return data;
            }
            return {
              ...data,
              notifications: data?.notifications?.map((x) => (x.readAt ? x : { ...x, readAt })),
            };
          },
          rollbackOnError(data) {
            if (!data) {
              return data;
            }
            return {
              ...data,
              notifications: data?.notifications?.map((x) => {
                const original = unreadNotifications.find((n) => n.id === x.id);
                return original ? { ...x, readAt: original.readAt } : x;
              }),
            };
          },
          shouldRevalidateAfter: true,
        },
      );

      await showToast({ style: Toast.Style.Success, title: "Marked all as read" });
      await launchCommand({ name: "unread-notifications", type: LaunchType.Background });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to mark all as read",
        message: getErrorMessage(error),
      });
    }
  }

  return (
    <List isLoading={isLoadingNotifications || isLoadingPriorities || isLoadingMe}>
      <List.EmptyView title="Inbox" description="You don't have any notifications." />

      {sections.map(({ title, notifications }) => {
        const numberOfNotifications =
          notifications.length === 1 ? "1 notification" : `${notifications.length} notifications`;

        return (
          <List.Section title={title} subtitle={numberOfNotifications} key={title}>
            {notifications.map((notification) => {
              const createdAt = new Date(notification.createdAt);

              const displayName = notification.actor
                ? notification.actor.displayName
                : notification.botActor
                  ? notification.botActor.name
                  : "Linear";

              const keywords = [displayName || "Linear"];

              if (notification.issue) {
                keywords.push(...notification.issue.identifier.split("-"));
                keywords.push(notification.issue.title);
              }

              const url = getNotificationURL(notification);

              // Use Linear API's subtitle and title for consistent display
              // Truncate to ensure accessories (date, icon) are never squeezed
              const truncate = (text: string, maxLength: number) => {
                const ellipsis = text.length > maxLength ? "…" : "";
                return text.substring(0, maxLength).trim() + ellipsis;
              };

              const notificationTitle = truncate(notification.title, 60);
              const notificationSubtitle = truncate(notification.subtitle, 80);

              return (
                <List.Item
                  title={notificationTitle}
                  subtitle={notificationSubtitle}
                  key={notification.id}
                  keywords={keywords}
                  icon={
                    notification.actor
                      ? getUserIcon(notification.actor)
                      : notification.botActor
                        ? getBotIcon(notification.botActor)
                        : "linear-app-icon.png"
                  }
                  accessories={[
                    {
                      date: createdAt,
                      tooltip: `${format(createdAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
                    },
                    {
                      icon: getNotificationIcon(notification),
                    },
                  ]}
                  actions={
                    <ActionPanel>
                      {notification.readAt ? (
                        <Action
                          title="Mark as Unread"
                          icon={Icon.Dot}
                          onAction={() => markAsUnread(notification)}
                          shortcut={{ modifiers: ["cmd"], key: "u" }}
                        />
                      ) : (
                        <Action
                          title="Mark as Read"
                          icon={Icon.Checkmark}
                          onAction={() => markAsRead(notification)}
                          shortcut={{ modifiers: ["cmd"], key: "u" }}
                        />
                      )}
                      {unreadNotifications.length > 0 ? (
                        <Action
                          title="Mark All as Read"
                          icon={Icon.CheckCircle}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                          onAction={markAllAsRead}
                        />
                      ) : null}
                      {url ? <OpenInLinear url={url} /> : null}
                      <ActionPanel.Section>
                        {notification.issue ? (
                          <Action.Push
                            title="Open Issue in Raycast"
                            target={<IssueDetail issue={notification.issue} priorities={priorities} me={me} />}
                            icon={Icon.RaycastLogoNeg}
                            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                          />
                        ) : null}

                        {urlKey ? (
                          <OpenInLinear title="Open Inbox" url={inboxUrl} shortcut={{ modifiers: ["cmd"], key: "o" }} />
                        ) : null}

                        <Action
                          title="Delete Notification"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() => deleteNotification(notification)}
                        />
                      </ActionPanel.Section>

                      {url ? (
                        <ActionPanel.Section>
                          <Action.CopyToClipboard
                            icon={Icon.Clipboard}
                            content={url}
                            title="Copy URL"
                            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                          />
                        </ActionPanel.Section>
                      ) : null}

                      <ActionPanel.Section>
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={{ modifiers: ["cmd"], key: "r" }}
                          onAction={() => mutateNotifications()}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}

export default function Command() {
  return (
    <View>
      <Notifications />
    </View>
  );
}
