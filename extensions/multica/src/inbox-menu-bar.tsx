import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openCommandPreferences,
  openExtensionPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import type { InboxLaunchContext } from "./inbox";
import { getCredentials } from "./lib/config";
import { webUrl } from "./lib/format";
import { fetchInboxCounts, totalUnread } from "./lib/inbox-counts";
import type { Workspace } from "./lib/types";

// Tinting with PrimaryText makes Raycast draw this as a template image, so it follows the
// menu bar's own appearance (which tracks the wallpaper, not the system light/dark mode).
const MENU_BAR_ICON = { source: "menu-bar-icon.svg", tintColor: Color.PrimaryText };

// Generated initials avatars use SVG gradients and text, which the menu bar renders as
// solid black, so menu items use plain status icons instead.
const unreadIcon = (count: number) =>
  count > 0 ? { source: Icon.CircleFilled, tintColor: Color.Orange } : { source: Icon.CheckCircle };

function openInbox(workspace: Workspace) {
  const context: InboxLaunchContext = { workspaceId: workspace.id };
  return launchCommand({ name: "inbox", type: LaunchType.UserInitiated, context });
}

export default function InboxMenuBar() {
  const { data, isLoading, error } = useCachedPromise(fetchInboxCounts, [], { onError: () => undefined });
  const total = data ? totalUnread(data) : 0;

  return (
    <MenuBarExtra
      icon={MENU_BAR_ICON}
      title={total > 0 ? String(total) : undefined}
      tooltip={total > 0 ? `${total} unread in Multica` : "Multica inbox"}
      isLoading={isLoading}
    >
      {error && (
        <MenuBarExtra.Item
          title="Couldn't load inbox counts"
          subtitle={error.message}
          icon={Icon.Warning}
          onAction={openExtensionPreferences}
        />
      )}
      {data && (
        <MenuBarExtra.Section title="Unread by Workspace">
          {data.map(({ workspace, count }) => (
            <MenuBarExtra.Item
              key={workspace.id}
              title={workspace.name}
              subtitle={count > 0 ? `${count} unread` : "All caught up"}
              icon={unreadIcon(count)}
              tooltip={`Open ${workspace.name} in My Inbox`}
              onAction={() => openInbox(workspace)}
              alternate={
                <MenuBarExtra.Item
                  title={workspace.name}
                  subtitle="Open Inbox in Browser"
                  icon={Icon.Globe}
                  onAction={() => open(webUrl(workspace, "inbox"))}
                />
              }
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        {!error && (
          <MenuBarExtra.Item title="Open Multica" icon={Icon.Globe} onAction={() => open(getCredentials().appUrl)} />
        )}
        <MenuBarExtra.Item title="Configure Command" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
