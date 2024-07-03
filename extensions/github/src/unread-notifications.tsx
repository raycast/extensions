import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  Toast,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
  openExtensionPreferences,
  showToast,
  Image,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { getGitHubClient } from "./api/githubClient";
import { Notification } from "./components/NotificationListItem";
import {
  getGitHubIcon,
  getGitHubURL,
  getNotificationIcon,
  getNotificationSubtitle,
  getNotificationTooltip,
} from "./helpers/notifications";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

const preferences = getPreferenceValues<Preferences.UnreadNotifications>();

function UnreadNotifications() {
  const { octokit } = getGitHubClient();

  const viewer = useViewer();

  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const response = await octokit.rest.activity.listNotificationsForAuthenticatedUser();
    return Promise.all(
      response.data.map(async (notification: Notification) => {
        const icon = await getNotificationIcon(notification);
        return { ...notification, icon };
      }),
    );
  });

  const hasUnread = data && data.length > 0;

  async function markAllNotificationsAsRead() {
    try {
      await mutate(octokit.rest.activity.markNotificationsAsRead(), {
        optimisticUpdate() {
          return [];
        },
      });
      showToast({ style: Toast.Style.Success, title: "Marked all notifications as read" });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Could not mark all notifications as read" });
    }
  }

  async function openNotification(notification: Notification) {
    try {
      const openAndMarkNotificationAsRead = async () => {
        if (notification.subject.type === "RepositoryInvitation") {
          open(`${notification.repository.html_url}/invitations`);
        } else {
          await open(await getGitHubURL(notification, viewer?.id));
          await octokit.rest.activity.markThreadAsRead({ thread_id: parseInt(notification.id) });
        }
      };

      await mutate(openAndMarkNotificationAsRead(), {
        optimisticUpdate(data) {
          return data?.filter((n: Notification) => n.id !== notification.id) ?? [];
        },
      });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Could not open notification" });
    }
  }

  async function markNotificationAsRead(notification: Notification) {
    try {
      await mutate(octokit.rest.activity.markThreadAsRead({ thread_id: parseInt(notification.id) }), {
        optimisticUpdate(data) {
          return data?.filter((n: Notification) => n.id !== notification.id) ?? [];
        },
      });
    } catch {
      showToast({ style: Toast.Style.Failure, title: "Could not mark notification as read" });
    }
  }

  if (!preferences.alwaysShow && !isLoading && data && data.length === 0) {
    return null;
  }

  return (
    <MenuBarExtra
      icon={getGitHubIcon(hasUnread)}
      title={preferences.showUnreadCount && hasUnread ? String(data.length) : undefined}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        icon={getGitHubIcon()}
        title="Open GitHub Notifications"
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onAction={() => open("https://github.com/notifications")}
      />

      <MenuBarExtra.Section>
        {hasUnread ? (
          data.map((notification: Notification & { icon: { value: Image; tooltip: string } }) => {
            const title = notification.subject.title;
            const updatedAt = new Date(notification.updated_at);
            const tooltip = getNotificationTooltip(updatedAt);
            return (
              <MenuBarExtra.Item
                key={notification.id}
                icon={{ source: notification.icon.value["source"], tintColor: Color.PrimaryText }}
                title={title}
                subtitle={getNotificationSubtitle(notification)}
                tooltip={tooltip}
                onAction={() => openNotification(notification)}
                alternate={
                  <MenuBarExtra.Item
                    icon={{ source: notification.icon.value["source"], tintColor: Color.PrimaryText }}
                    title={title}
                    subtitle="Mark as Read"
                    tooltip={tooltip}
                    onAction={() => markNotificationAsRead(notification)}
                  />
                }
              />
            );
          })
        ) : (
          <MenuBarExtra.Item title="No Unread Notifications" />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        {hasUnread ? (
          <MenuBarExtra.Item
            title="Mark All as Read"
            icon={Icon.Checkmark}
            shortcut={{ /* gmail uses shift-i to mark as read */ modifiers: ["cmd"], key: "i" }}
            onAction={markAllNotificationsAsRead}
          />
        ) : null}
        <MenuBarExtra.Item
          title="View All Notifications"
          icon={Icon.Eye}
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          onAction={() => launchCommand({ name: "notifications", type: LaunchType.UserInitiated })}
        />

        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
          alternate={
            <MenuBarExtra.Item title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default withGitHubClient(UnreadNotifications);
