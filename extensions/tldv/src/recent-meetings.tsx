import {
  MenuBarExtra,
  Icon,
  openExtensionPreferences,
  open,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useWorkspaces, useRecentMeetings, usePreferences } from "./hooks";
import { formatDate, formatDuration } from "./utils";

const MENU_BAR_LIMIT = 5;

export default function RecentMeetingsMenuBar() {
  const prefs = usePreferences();
  const { workspaces, currentWorkspace } = useWorkspaces();
  const { meetings, isLoading, error, refresh } = useRecentMeetings(
    currentWorkspace,
    MENU_BAR_LIMIT,
  );

  // Menu bar disabled in preferences
  if (prefs.showMenuBar === false) {
    return null;
  }

  // No workspaces configured
  if (workspaces.length === 0) {
    return (
      <MenuBarExtra icon={Icon.Video} tooltip="tl;dv Meetings">
        <MenuBarExtra.Item
          title="No API Key Configured"
          icon={Icon.ExclamationMark}
          onAction={openExtensionPreferences}
        />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item
          title="Open Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra>
    );
  }

  // Error state
  if (error && meetings.length === 0) {
    return (
      <MenuBarExtra icon={Icon.Video} tooltip="tl;dv Meetings">
        <MenuBarExtra.Item
          title="Failed to load meetings"
          icon={Icon.ExclamationMark}
        />
        <MenuBarExtra.Item title={error} />
        <MenuBarExtra.Separator />
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          onAction={refresh}
        />
        <MenuBarExtra.Item
          title="Open Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra>
    );
  }

  const dateFormat = prefs.dateFormat || "relative";

  return (
    <MenuBarExtra
      icon={Icon.Video}
      isLoading={isLoading}
      tooltip="tl;dv Meetings"
    >
      {/* Workspace indicator for multiple workspaces */}
      {workspaces.length > 1 && currentWorkspace && (
        <>
          <MenuBarExtra.Item
            title={`Workspace: ${currentWorkspace.name}`}
            icon={Icon.Building}
          />
          <MenuBarExtra.Separator />
        </>
      )}

      {/* Recent meetings */}
      <MenuBarExtra.Section title="Recent Meetings">
        {meetings.length === 0 ? (
          <MenuBarExtra.Item title="No recent meetings" icon={Icon.Video} />
        ) : (
          meetings.map((meeting) => (
            <MenuBarExtra.Item
              key={meeting.id}
              title={truncateTitle(meeting.name, 40)}
              subtitle={`${formatDuration(meeting.duration)} • ${formatDate(meeting.happenedAt, dateFormat)}`}
              icon={Icon.Video}
              onAction={() => open(meeting.url)}
              tooltip={meeting.name}
            />
          ))
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      {/* Actions */}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="List All Meetings"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() =>
            launchCommand({
              name: "list-meetings",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Search Meetings"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "s" }}
          onAction={() =>
            launchCommand({
              name: "search-meetings",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Separator />

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Refresh"
          icon={Icon.ArrowClockwise}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
          onAction={refresh}
        />
        <MenuBarExtra.Item
          title="Open tl;dv"
          icon={Icon.Globe}
          shortcut={{ modifiers: ["cmd"], key: "o" }}
          onAction={() => open("https://tldv.io")}
        />
        <MenuBarExtra.Item
          title="Preferences"
          icon={Icon.Gear}
          onAction={openExtensionPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

// Truncate title for menu bar display
function truncateTitle(title: string, maxLength: number): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + "...";
}
