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
import { countBy } from "lodash";
import React from "react";

import { NotificationResult } from "./api/getNotifications";
import { getLinearClientFor } from "./api/linearClient";
import { updateNotification } from "./api/updateNotification";
import { entryKey } from "./api/workspaces";
import { getNotificationMenuBarTitle, getNotificationURL } from "./helpers/notifications";
import { getUserIcon } from "./helpers/users";
import useAllWorkspaceNotifications, { WorkspaceNotificationRow } from "./hooks/useAllWorkspaceNotifications";

const preferences = getPreferenceValues<Preferences.UnreadNotifications>();

function UnreadNotifications() {
  const { rows, isLoading, mutate } = useAllWorkspaceNotifications();

  const unreadOf = (row: WorkspaceNotificationRow) =>
    row.notifications.filter((n) => !n.readAt && (!n.snoozedUntilAt || n.snoozedUntilAt < new Date()));

  const totalUnread = rows.flatMap(unreadOf); // count sums reachable entries only (P4)

  const truncate = (text: string, maxLength: number) => {
    const ellipsis = text.length > maxLength ? "…" : "";
    return text.substring(0, maxLength).trim() + ellipsis;
  };

  async function markAsRead(row: WorkspaceNotificationRow, notification: NotificationResult) {
    if (row.status !== "ok") return;
    try {
      // Resolved at ACTION TIME, never stored on the row (C1): a cached client would
      // serialize its bearer token to Raycast's unencrypted cache.
      const { linearClient } = await getLinearClientFor(
        { orgId: row.entry.orgId, userId: row.entry.userId },
        { interactive: false },
      );
      await updateNotification({ id: notification.id, readAt: new Date() }, linearClient); // that section's client — never the global one
    } catch {
      // Background client resolution failed (expired/revoked token, transient network
      // error). No toast — this is an unattended menu-bar context — but silently no-op'ing
      // would hide the failure entirely; refresh instead so the row surfaces as
      // "needs re-authentication" (or clears itself on a transient blip).
    } finally {
      await mutate();
    }
  }

  async function markAllAsRead(row: WorkspaceNotificationRow) {
    if (row.status !== "ok") return;
    const readAt = new Date();
    try {
      const { linearClient } = await getLinearClientFor(
        { orgId: row.entry.orgId, userId: row.entry.userId },
        { interactive: false },
      );
      await Promise.all(unreadOf(row).map((n) => updateNotification({ id: n.id, readAt }, linearClient)));
    } catch {
      // See markAsRead: refresh on failure instead of silently no-op'ing.
    } finally {
      await mutate();
    }
  }

  async function openInbox(row: WorkspaceNotificationRow) {
    const applications = await getApplications();
    const linearApp = applications.find((app) => app.bundleId === "com.linear");
    await open(`https://linear.app/${row.urlKey}/inbox`, linearApp);
  }

  async function openNotification(row: WorkspaceNotificationRow, notification: NotificationResult) {
    const applications = await getApplications();
    const linearApp = applications.find((app) => app.bundleId === "com.linear");
    // WS-31: the notification's own workspace URL — API-provided absolute url first,
    // inbox fallback built from the ROW's urlKey, never the active workspace's.
    const url = getNotificationURL(notification);
    await open(url ?? `https://linear.app/${row.urlKey}/inbox`, linearApp);
    await markAsRead(row, notification);
  }

  if (!preferences.alwaysShow && !isLoading && totalUnread.length === 0) return null;

  const multi = rows.length >= 2;
  const entriesPerOrg = countBy(rows, (row) => row.entry.orgId);

  return (
    <MenuBarExtra
      title={getNotificationMenuBarTitle(totalUnread)}
      icon={{ source: { dark: "dark/linear.svg", light: "light/linear.svg" } }}
      isLoading={isLoading}
    >
      {rows.map((row) => (
        <MenuBarExtra.Section
          key={entryKey(row.entry)}
          {...(multi
            ? {
                title: row.entry.orgName + (entriesPerOrg[row.entry.orgId] > 1 ? ` (${row.entry.userEmail})` : ""),
              }
            : {})}
        >
          {row.status === "needs-reauth" ? (
            <MenuBarExtra.Item
              title={`Re-authenticate ${row.entry.orgName}`}
              icon={Icon.Key}
              onAction={() => launchCommand({ name: "manage-workspaces", type: LaunchType.UserInitiated })}
            />
          ) : (
            <>
              <MenuBarExtra.Item
                title="Open Inbox"
                icon="linear-app-icon.png"
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => openInbox(row)}
              />
              {unreadOf(row).length > 0 ? (
                <MenuBarExtra.Item
                  title="Mark All as Read"
                  icon={Icon.CheckCircle}
                  shortcut={{
                    macOS: { modifiers: ["cmd", "shift"], key: "u" },
                    Windows: { modifiers: ["ctrl", "shift"], key: "u" },
                  }}
                  onAction={() => markAllAsRead(row)}
                />
              ) : null}
              {unreadOf(row).map((notification) => {
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
                    onAction={() => openNotification(row, notification)}
                    alternate={
                      <MenuBarExtra.Item
                        icon={icon}
                        title={title}
                        subtitle="Mark as Read"
                        tooltip={tooltip}
                        onAction={() => markAsRead(row, notification)}
                      />
                    }
                  />
                );
              })}
            </>
          )}
        </MenuBarExtra.Section>
      ))}
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
      <UnreadNotifications />
    </BackgroundAuthBoundary>
  );
}
