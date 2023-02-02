import { ActionPanel, Action, List, showToast, Toast, Icon, launchCommand, LaunchType } from "@raycast/api";
import { format } from "date-fns";

import { NotificationResult } from "./api/getNotifications";
import { updateNotification } from "./api/updateNotification";
import { deleteNotification as linearDeleteNotification } from "./api/deleteNotification";

import useNotifications from "./hooks/useNotifications";
import usePriorities from "./hooks/usePriorities";
import useMe from "./hooks/useMe";
import useUsers from "./hooks/useUsers";

import { getErrorMessage } from "./helpers/errors";
import { getNotificationIcon, getNotificationTitle } from "./helpers/notifications";
import { getUserIcon } from "./helpers/users";
import { isLinearInstalled } from "./helpers/isLinearInstalled";

import View from "./components/View";
import IssueDetail from "./components/IssueDetail";

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
  const { users, isLoadingUsers } = useUsers();

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
              x.id === notification.id ? { ...x, readAt: new Date() } : x
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
              x.id === notification.id ? { ...x, readAt: notification.readAt } : x
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
              x.id === notification.id ? { ...x, readAt: undefined } : x
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
              x.id === notification.id ? { ...x, readAt: notification.readAt } : x
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

  return (
    <List isLoading={isLoadingNotifications || isLoadingPriorities || isLoadingMe || isLoadingUsers}>
      <List.EmptyView title="Inbox" description="You don't have any notifications." />

      {sections.map(({ title, notifications }) => {
        const numberOfNotifications =
          notifications.length === 1 ? "1 notification" : `${notifications.length} notifications`;

        return (
          <List.Section title={title} subtitle={numberOfNotifications} key={title}>
            {notifications.map((notification) => {
              const createdAt = new Date(notification.createdAt);

              return (
                <List.Item
                  title={`${getNotificationTitle(notification)} by ${
                    notification.actor ? notification.actor.displayName : "Linear"
                  }`}
                  key={notification.id}
                  icon={notification.actor ? getUserIcon(notification.actor) : "linear.png"}
                  {...(notification.issue
                    ? { subtitle: `${notification.issue?.identifier} ${notification.issue?.title}` }
                    : {})}
                  accessories={[
                    {
                      date: createdAt,
                      tooltip: `Created: ${format(createdAt, "EEEE d MMMM yyyy 'at' HH:mm")}`,
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
                          icon={Icon.Checkmark}
                          onAction={() => markAsUnread(notification)}
                        />
                      ) : (
                        <Action title="Mark as Read" icon={Icon.Checkmark} onAction={() => markAsRead(notification)} />
                      )}

                      {urlKey ? (
                        isLinearInstalled ? (
                          <Action.Open
                            title="Open Inbox in Linear"
                            icon="linear.png"
                            target={inboxUrl}
                            application="Linear"
                          />
                        ) : (
                          <Action.OpenInBrowser title="Open Inbox in Browser" url={inboxUrl} />
                        )
                      ) : null}

                      <ActionPanel.Section>
                        {notification.issue ? (
                          <>
                            <Action.Push
                              title="Open Issue in Raycast"
                              target={
                                <IssueDetail issue={notification.issue} priorities={priorities} users={users} me={me} />
                              }
                              icon={Icon.Sidebar}
                              shortcut={{ modifiers: ["cmd"], key: "o" }}
                            />

                            <Action.OpenInBrowser
                              title="Open Issue in Browser"
                              url={notification.issue.url}
                              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                            />
                          </>
                        ) : null}

                        <Action
                          title="Delete Notification"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                          onAction={() => deleteNotification(notification)}
                        />
                      </ActionPanel.Section>

                      {notification.issue ? (
                        <ActionPanel.Section>
                          <Action.CopyToClipboard
                            icon={Icon.Clipboard}
                            content={notification.issue.url}
                            title="Copy Issue URL"
                            shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                          />

                          <Action.CopyToClipboard
                            icon={Icon.Clipboard}
                            content={notification.issue.title}
                            title="Copy Issue Title"
                            shortcut={{ modifiers: ["cmd", "shift"], key: "'" }}
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
