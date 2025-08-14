import {
  getApplications,
  MenuBarExtra,
  open,
  openCommandPreferences,
  launchCommand,
  LaunchType,
  getPreferenceValues,
  openExtensionPreferences,
  Icon,
} from "@raycast/api";

import { NotificationResult } from "./api/getNotifications";
import { updateNotification } from "./api/updateNotification";
import View from "./components/View";
import { getNotificationMenuBarTitle, getNotificationTitle, getNotificationURL } from "./helpers/notifications";
import { getUserIcon } from "./helpers/users";
import useNotifications from "./hooks/useNotifications";

const preferences = getPreferenceValues<Preferences.UnreadNotifications>();

function UnreadNotifications() {
  const { isLoadingNotifications, unreadNotifications, urlKey, mutateNotifications } = useNotifications();

  async function markNotificationAsRead(notification: NotificationResult) {
    await mutateNotifications(updateNotification({ id: notification.id, readAt: new Date() }), {
      optimisticUpdate(data) {
        if (!data) {
          return data;
        }
        return {
          ...data,
          notifications: data?.notifications?.map((x) => (x.id === notification.id ? { ...x, readAt: new Date() } : x)),
        };
      },
      shouldRevalidateAfter: true,
    });
  }

  async function openNotification(notification: NotificationResult) {
    const applications = await getApplications();
    const linearApp = applications.find((app) => app.bundleId === "com.linear");
    const url = getNotificationURL(notification);
    if (url) {
      await open(url, linearApp);
    } else {
      await openInbox();
    }
    await markNotificationAsRead(notification);
  }

  async function openInbox() {
    const applications = await getApplications();
    const linearApp = applications.find((app) => app.bundleId === "com.linear");
    await open(`https://linear.app/${urlKey}/inbox`, linearApp);
  }

  const truncate = (text: string, maxLength: number) => {
    const ellipsis = text.length > maxLength ? "…" : "";
    return text.substring(0, maxLength).trim() + ellipsis;
  };

  if (!preferences.alwaysShow && !isLoadingNotifications && unreadNotifications && unreadNotifications.length === 0) {
    return null;
  }

  return (
    <MenuBarExtra
      title={getNotificationMenuBarTitle(unreadNotifications)}
      icon={{ source: { dark: "dark/linear.svg", light: "light/linear.svg" } }}
      isLoading={isLoadingNotifications}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Inbox"
          icon="linear-app-icon.png"
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={openInbox}
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={unreadNotifications.length !== 0 ? "Unread Notifications" : "No Unread Notifications"}
        />

        {unreadNotifications.map((notification) => {
          const title = `${getNotificationTitle(notification)} by ${
            notification.actor ? notification.actor.displayName : "Linear"
          }`;

          const icon = notification.actor ? getUserIcon(notification.actor) : "linear-app-icon.png";
          const subtitle = notification.issue?.title ? truncate(notification.issue.title, 20) : "";
          const tooltip = `${notification.issue?.identifier}: ${notification.issue?.title}`;

          return (
            <MenuBarExtra.Item
              key={notification.id}
              icon={icon}
              title={title}
              subtitle={subtitle}
              tooltip={tooltip}
              onAction={() => openNotification(notification)}
              alternate={
                <MenuBarExtra.Item
                  icon={icon}
                  title={title}
                  subtitle="Mark as Read"
                  tooltip={tooltip}
                  onAction={() => markNotificationAsRead(notification)}
                />
              }
            />
          );
        })}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.Eye}
          title="View All Notifications"
          onAction={() => launchCommand({ name: "notifications", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title="Configure Command"
          icon={Icon.Gear}
          shortcut={{ modifiers: ["cmd"], key: "," }}
          onAction={() => openCommandPreferences()}
          alternate={
            <MenuBarExtra.Item title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
          }
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
