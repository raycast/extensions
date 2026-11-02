import {
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  environment,
  getApplications,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { ACCESSIBILITY_SETTINGS, openDockApp, resolvePaths, useIgnoredApps } from "./apps";
import { AccessibilityError, DockTile, readDockTiles, readSystemDarkMode } from "./dock";

// Built-in icons in the dropdown are tinted against Raycast's app theme rather than the menu's
// appearance, so tint them explicitly for the system Light/Dark appearance the menu actually uses.
// Values match AppKit's labelColor (85% black / 85% white), which is what native menus draw with.
const menuIcon = (source: Icon, darkMode: boolean) => ({
  source,
  tintColor: darkMode ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.85)",
});

/** macOS system red, as used for Dock badges. */
const BADGE_RED = "#FF3B30";

/**
 * Menu bar glyph for the chosen symbol and style. Circle uses Raycast's built-in icons; Bell and App use
 * the SF Symbol SVGs in assets/icons ({bell,app}[-badge][-fill].svg). All are tinted at render time.
 */
function iconSource(
  { symbol = "circle", symbolStyle = "filled" }: Preferences.ShowDockBadges,
  badged: boolean,
): Image.Source {
  const filled = symbolStyle === "filled";
  if (symbol === "circle") return filled ? Icon.CircleFilled : Icon.Circle;
  return `icons/${symbol}${badged ? "-badge" : ""}${filled ? "-fill" : ""}.svg`;
}

function notificationLabel(total: number): string {
  return `${total} Notification${total === 1 ? "" : "s"}`;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.ShowDockBadges>();
  const menuOpen = environment.launchType === LaunchType.UserInitiated;

  const { data, isLoading, error, revalidate } = useCachedPromise(readDockTiles, [], {
    keepPreviousData: true,
    // Errors are shown in the dropdown; skip the default "Failed to fetch latest data" toast.
    onError: () => undefined,
  });
  const { data: applications } = useCachedPromise(getApplications, [], { keepPreviousData: true });
  const { isIgnored, isLoading: ignoredLoading } = useIgnoredApps(data);
  const { data: darkMode = false } = useCachedPromise(readSystemDarkMode, [], {
    keepPreviousData: true,
    execute: menuOpen,
  });

  const badged = (data ?? [])
    .filter((tile) => tile.count > 0 && !isIgnored(tile))
    .map((tile) => ({ tile, ...resolvePaths(tile, applications) }));
  const total = badged.reduce((sum, { tile }) => sum + tile.count, 0);
  const hasBadges = total > 0;

  // Returning null ends a menu-bar run (there is no isLoading to wait on), so only hide after
  // a completed read. Otherwise a cached empty list can tear the command down before a new badge
  // is seen, and Hide When Clear would stay blank until the user opens it by hand.
  if (preferences.hideWhenClear && !isLoading && !ignoredLoading && data && !error && !hasBadges) {
    return null;
  }

  const accessibilityDenied = error instanceof AccessibilityError;
  // Idle: tint with PrimaryText so the glyph follows the menu bar's foreground colour (including
  // wallpaper-based tinting) like a native template image. Badged: system red, so the attention
  // state is unmistakable against the other monochrome menu bar extras.
  const icon = error
    ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
    : { source: iconSource(preferences, hasBadges), tintColor: hasBadges ? BADGE_RED : Color.PrimaryText };

  return (
    <MenuBarExtra
      icon={icon}
      title={preferences.showCount && hasBadges ? String(total) : undefined}
      tooltip={error ? error.message : hasBadges ? notificationLabel(total) : "No Notifications"}
      isLoading={isLoading || ignoredLoading}
    >
      {accessibilityDenied ? (
        <MenuBarExtra.Section title="Accessibility Permission Required">
          <MenuBarExtra.Item
            title="Allow Raycast in Privacy & Security → Accessibility"
            icon={menuIcon(Icon.Lock, darkMode)}
            onAction={() => open(ACCESSIBILITY_SETTINGS)}
          />
        </MenuBarExtra.Section>
      ) : error ? (
        <MenuBarExtra.Section title="Error">
          <MenuBarExtra.Item
            title={error.message}
            icon={menuIcon(Icon.ExclamationMark, darkMode)}
            tooltip="Click to retry"
            onAction={revalidate}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title={hasBadges ? notificationLabel(total) : "No Notifications"}>
          {badged.map(({ tile, iconPath, openPath }) => (
            <AppItem
              key={`${tile.name}-${tile.ordinal}`}
              tile={tile}
              iconPath={iconPath}
              openPath={openPath}
              darkMode={darkMode}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="View in Raycast"
          icon={menuIcon(Icon.List, darkMode)}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={viewNotifications}
        />
        <MenuBarExtra.Item
          title="Refresh"
          icon={menuIcon(Icon.ArrowClockwise, darkMode)}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={revalidate}
        />
        <MenuBarExtra.Item
          title="Preferences…"
          icon={menuIcon(Icon.Gear, darkMode)}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function viewNotifications() {
  return launchCommand({ name: "view-notifications", type: LaunchType.UserInitiated });
}

function AppItem({
  tile,
  iconPath,
  openPath,
  darkMode,
}: {
  tile: DockTile;
  iconPath?: string;
  openPath?: string;
  darkMode: boolean;
}) {
  return (
    <MenuBarExtra.Item
      title={tile.name}
      subtitle={tile.badge}
      icon={iconPath ? { fileIcon: iconPath } : menuIcon(Icon.AppWindow, darkMode)}
      onAction={() => openDockApp(tile, openPath)}
    />
  );
}
