import {
  getApplications,
  MenuBarExtra,
  open,
  launchCommand,
  LaunchType,
  getPreferenceValues,
  Icon,
  openCommandPreferences,
  openExtensionPreferences,
  Keyboard,
} from "@raycast/api";
import React from "react";

import { NotificationResult } from "./api/getNotifications";
import { updateNotification } from "./api/updateNotification";
import View from "./components/View";
import { getNotificationMenuBarTitle, getNotificationURL } from "./helpers/notifications";
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

  async function markAllAsRead() {
    if (unreadNotifications.length === 0) {
      return;
    }

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
        shouldRevalidateAfter: true,
      },
    );
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
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={openInbox}
        />
        {unreadNotifications.length > 0 ? (
          <MenuBarExtra.Item
            title="Mark All as Read"
            icon={Icon.CheckCircle}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "u" },
              Windows: { modifiers: ["ctrl", "shift"], key: "u" },
            }}
            onAction={markAllAsRead}
          />
        ) : null}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={unreadNotifications.length !== 0 ? "Unread Notifications" : "No Unread Notifications"}
        />

        {unreadNotifications.map((notification) => {
          // Use Linear API's title and subtitle fields for consistent notification display
          const title = truncate(notification.subtitle, 30);
          const icon = notification.actor ? getUserIcon(notification.actor) : "linear-app-icon.png";
          const subtitle = truncate(notification.title, 20);
          const tooltip = `${notification.subtitle}: ${notification.title}`;

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
          shortcut={{ macOS: { modifiers: ["cmd"], key: "," }, Windows: { modifiers: ["ctrl"], key: "," } }}
          onAction={() => openCommandPreferences()}
          alternate={
            <MenuBarExtra.Item title="Configure Extension" icon={Icon.Gear} onAction={openExtensionPreferences} />
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

/**
 * Catches "OAuth request creation is not available when command is launched in background".
 * This happens when the menu bar command refreshes in the background and the user hasn't
 * signed in yet. Returning null hides the menu bar icon rather than showing a red triangle.
 */
class BackgroundAuthBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (error.message.includes("OAuth request creation is not available when command is launched in background")) {
      return null;
    }

    // Re-throwing inside render() delegates to the next parent error boundary (Raycast's
    // top-level handler). This is intentional: only the background OAuth error is silenced.
    throw error;
  }
}

export default function Command() {
  return (
    <BackgroundAuthBoundary>
      <View>
        <UnreadNotifications />
      </View>
    </BackgroundAuthBoundary>
  );
}
