import { Action, ActionPanel, Color, confirmAlert, Icon, List, showToast, Toast } from "@raycast/api";
import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Notification } from "./types";

const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "always" });

const units = {
  year: 24 * 60 * 60 * 1000 * 365,
  month: (24 * 60 * 60 * 1000 * 365) / 12,
  week: 24 * 60 * 60 * 1000 * 7,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
};

function getRelativeTimeString(date: string) {
  const now = new Date();
  const diffInMs = new Date(date).getTime() - now.getTime();
  const absDiff = Math.abs(diffInMs);

  for (const [unit, msValue] of Object.entries(units)) {
    if (absDiff >= msValue || unit === "second") {
      const value = Math.round(diffInMs / msValue);
      return rtf.format(value, unit as Intl.RelativeTimeFormatUnit);
    }
  }
}

export default function Command() {
  const { instanceUrl, apiToken } = getPreferenceValues();
  const apiUrl = new URL(instanceUrl);
  apiUrl.pathname = "/api/notification";
  const {
    isLoading,
    data: notifications = [],
    revalidate,
  } = useFetch<Notification[]>(apiUrl.toString(), {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
  });

  const typeIcon: Record<string, Icon> = {
    task: Icon.CheckList,
    project: Icon.AppWindowGrid2x2,
    organization: Icon.MugSteam,
    workspace: Icon.AppWindowGrid3x3,
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    if (a.isRead !== b.isRead) {
      return a.isRead ? 1 : -1;
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const markNotificationAsRead = async (notificationId: string) => {
    const url = new URL(apiUrl);
    url.pathname = `/api/notification/${notificationId}/read`;
    try {
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
      });
      if (!res.ok) {
        return showToast(Toast.Style.Failure, "Failed to mark notification as read");
      }
      await revalidate();
      return showToast(Toast.Style.Success, "Notification marked as read");
    } catch (error) {
      console.error(error);
      return showToast(Toast.Style.Failure, "Failed to mark notification as read");
    }
  };

  const markAllNotificationsAsRead = async () => {
    const url = new URL(apiUrl);
    url.pathname = `/api/notification/read-all`;
    try {
      const res = await fetch(url.toString(), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
      });
      if (!res.ok) {
        return showToast(Toast.Style.Failure, "Failed to mark all notifications as read");
      }
      await revalidate();
      return showToast(Toast.Style.Success, "All notifications marked as read");
    } catch (error) {
      console.error(error);
      return showToast(Toast.Style.Failure, "Failed to mark all notifications as read");
    }
  };

  const clearNotifications = async () => {
    const confirm = await confirmAlert({
      title: "Clear notifications",
      message: "Are you sure you want to clear all notifications?",
    });

    if (!confirm) return;

    const url = new URL(apiUrl);
    url.pathname = `/api/notification/clear-all`;
    try {
      const res = await fetch(url.toString(), {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiToken}`,
        },
      });
      if (!res.ok) {
        return showToast(Toast.Style.Failure, "Failed to clear notifications");
      }
      await revalidate();
      return showToast(Toast.Style.Success, "All notifications cleared");
    } catch (error) {
      console.error(error);
      return showToast(Toast.Style.Failure, "Failed to clear notifications");
    }
  };

  return (
    <List isLoading={isLoading}>
      <List.EmptyView title="No notifications" />
      {sortedNotifications.map((notification) => (
        <List.Item
          key={notification.id}
          title={notification.title}
          subtitle={notification.content}
          icon={typeIcon[notification.resourceType]}
          actions={
            <ActionPanel>
              <Action title="Mark as Read" onAction={() => markNotificationAsRead(notification.id)} />
              <Action
                title="Mark All as Read"
                onAction={() => markAllNotificationsAsRead()}
                shortcut={{
                  Windows: {
                    modifiers: ["ctrl", "shift"],
                    key: "r",
                  },
                  macOS: {
                    modifiers: ["cmd", "shift"],
                    key: "r",
                  },
                }}
              />
              <Action
                title="Clear Notifications"
                onAction={() => clearNotifications()}
                shortcut={{
                  Windows: {
                    modifiers: ["ctrl", "shift"],
                    key: "d",
                  },
                  macOS: {
                    modifiers: ["cmd", "shift"],
                    key: "d",
                  },
                }}
              />
            </ActionPanel>
          }
          accessories={[
            {
              tag: {
                value: getRelativeTimeString(notification.createdAt),
                color: Color.SecondaryText,
              },
            },
            {
              tag: {
                value: notification.isRead ? "Read" : "Unread",
                color: notification.isRead ? Color.Green : Color.Red,
              },
            },
          ]}
        />
      ))}
    </List>
  );
}
