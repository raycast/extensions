import {
  getPreferenceValues,
  launchCommand,
  LaunchType,
  MenuBarExtra,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";

import { Notification } from "./components/NotificationListItem";
import View from "./components/View";
import {
  getGitHubIcon,
  getGitHubURL,
  getNotificationIcon,
  getNotificationSubtitle,
  getNotificationTooltip,
} from "./helpers/notifications";
import { getGitHubClient } from "./helpers/withGithubClient";
import { useViewer } from "./hooks/useViewer";

const preferences = getPreferenceValues<Preferences.UnreadNotifications>();

function UnreadNotifications() {
  const { octokit } = getGitHubClient();

  const viewer = useViewer();

  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const response = await octokit.rest.activity.listNotificationsForAuthenticatedUser();
    return response.data;
  });

  async function openNotification(notification: Notification) {
    try {
      const openAndMarkNotificationAsRead = async () => {
        await open(getGitHubURL(notification, viewer?.id));
        await octokit.rest.activity.markThreadAsRead({ thread_id: parseInt(notification.id) });
      };

      await mutate(openAndMarkNotificationAsRead(), {
        optimisticUpdate(data) {
          return data?.filter((n) => n.id !== notification.id) ?? [];
        },
      });
    } catch (err) {
      showHUD("❌ Could not open the notification");
    }
  }

  if (!preferences.alwaysShow && !isLoading && data && data.length === 0) {
    return null;
  }

  return (
    <MenuBarExtra
      icon={getGitHubIcon(data && data.length > 0)}
      title={data && data.length > 0 ? String(data.length) : undefined}
      isLoading={isLoading}
    >
      <MenuBarExtra.Item
        icon={getGitHubIcon()}
        title="Open GitHub Notifications"
        shortcut={{ modifiers: ["cmd"], key: "o" }}
        onAction={() => open("https://github.com/notifications")}
      />

      <MenuBarExtra.Section>
        {data && data.length > 0 ? (
          data.map((notification) => {
            const icon = getNotificationIcon(notification);
            const updatedAt = new Date(notification.updated_at);

            return (
              <MenuBarExtra.Item
                key={notification.id}
                icon={{ source: icon.value, tintColor: { light: "#000", dark: "#fff", adjustContrast: false } }}
                title={notification.subject.title}
                subtitle={getNotificationSubtitle(notification)}
                tooltip={getNotificationTooltip(updatedAt)}
                onAction={() => openNotification(notification)}
              />
            );
          })
        ) : (
          <MenuBarExtra.Item title="No Unread Notifications" />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View All Notifications"
          shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          onAction={() => launchCommand({ name: "notifications", type: LaunchType.UserInitiated })}
        />

        <MenuBarExtra.Item
          title="Configure Command"
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

export default function Command() {
  return (
    <View>
      <UnreadNotifications />
    </View>
  );
}
