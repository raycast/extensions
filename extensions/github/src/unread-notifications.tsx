import {
  Color,
  getPreferenceValues,
  Icon,
  Image,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

import { getGitHubClient } from "./api/githubClient";
import {
  getGitHubIcon,
  getGitHubURL,
  getNotificationIcon,
  getNotificationSubtitle,
  getNotificationTooltip,
  Notification,
} from "./helpers/notifications";
import { withGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

const preferences = getPreferenceValues<Preferences.UnreadNotifications>();

function UnreadNotifications() {
  const { octokit } = getGitHubClient();

  const viewer = useViewer();

  const repositoryListArray = useMemo(() => {
    if (!preferences.repositoryList) return [];
    return preferences.repositoryList
      .split(",")
      .map((repo) => repo.trim())
      .filter((repo) => repo.length > 0);
  }, [preferences.repositoryList]);

  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const notificationsPage = await octokit.paginate(octokit.activity.listNotificationsForAuthenticatedUser, {
      per_page: 50,
    });
    let notifications = notificationsPage;

    if (preferences.repositoryFilterMode !== "all" && repositoryListArray.length > 0) {
      if (preferences.repositoryFilterMode === "include") {
        notifications = notifications.filter((notification) =>
          repositoryListArray.some((repo) => repo.toLowerCase() === notification.repository.full_name.toLowerCase()),
        );
      } else {
        notifications = notifications.filter(
          (notification) =>
            !repositoryListArray.some((repo) => repo.toLowerCase() === notification.repository.full_name.toLowerCase()),
        );
      }
    }

    return Promise.all(
      notifications.map(async (notification: Notification) => {
        const icon = await getNotificationIcon(notification);
        return { ...notification, icon };
      }),
    );
  });

  const hasUnread = data && data.length > 0;

  async function markAllNotificationsAsRead() {
    try {
      await mutate(octokit.activity.markNotificationsAsRead(), {
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
          await octokit.activity.markThreadAsRead({ thread_id: parseInt(notification.id) });
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
      await mutate(octokit.activity.markThreadAsRead({ thread_id: parseInt(notification.id) }), {
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
        shortcut={Keyboard.Shortcut.Common.Open}
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
            shortcut={{ macOS: { modifiers: ["cmd"], key: "i" }, Windows: { modifiers: ["ctrl"], key: "i" } }}
            onAction={markAllNotificationsAsRead}
          />
        ) : null}
        <MenuBarExtra.Item
          title="View All Notifications"
          icon={Icon.Eye}
          shortcut={Keyboard.Shortcut.Common.OpenWith}
          onAction={() => launchCommand({ name: "notifications", type: LaunchType.UserInitiated })}
        />

        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          // Reserved OpenPreferences keys, but this is the Configure Command action — keep custom binding.
          // eslint-disable-next-line @raycast/no-reserved-shortcut, @raycast/no-ambiguous-platform-shortcut
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
