import {
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  environment,
  getPreferenceValues,
  open,
  openCommandPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  AccessibilityError,
  DockTile,
  clickDockTile,
  isAccessibilityError,
  readDockTiles,
  readSystemDarkMode,
} from "./dock";

// Built-in icons in the dropdown are tinted against Raycast's app theme rather than the menu's
// appearance, so tint them explicitly for the system Light/Dark appearance the menu actually uses.
// Values match AppKit's labelColor (85% black / 85% white), which is what native menus draw with.
const menuIcon = (source: Icon, darkMode: boolean) => ({
  source,
  tintColor: darkMode ? "rgba(255, 255, 255, 0.85)" : "rgba(0, 0, 0, 0.85)",
});

/** macOS system red, as used for Dock badges. */
const BADGE_RED = "#FF3B30";

const ACCESSIBILITY_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

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
  return `${total} notification${total === 1 ? "" : "s"}`;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.ShowDockBadges>();
  const menuOpen = environment.launchType === LaunchType.UserInitiated;

  const { data, isLoading, error, revalidate } = useCachedPromise(readDockTiles, [], {
    keepPreviousData: true,
    // Errors are shown in the dropdown; skip the default "Failed to fetch latest data" toast.
    onError: () => undefined,
  });
  const { data: darkMode = environment.appearance === "dark" } = useCachedPromise(readSystemDarkMode, [], {
    keepPreviousData: true,
    execute: menuOpen,
  });

  const badged = (data ?? []).filter((tile) => tile.count > 0);
  const total = badged.reduce((sum, tile) => sum + tile.count, 0);
  const hasBadges = total > 0;

  // Returning null ends a menu-bar run (there is no isLoading to wait on), so only hide after
  // a completed read. Otherwise a cached empty list can tear the command down before a new badge
  // is seen, and Hide When Clear would stay blank until the user opens it by hand.
  if (preferences.hideWhenClear && !isLoading && data && !error && !hasBadges) {
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
      tooltip={error ? error.message : hasBadges ? notificationLabel(total) : "No notifications"}
      isLoading={isLoading}
    >
      {accessibilityDenied ? (
        <MenuBarExtra.Section title="Accessibility permission required">
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
        <MenuBarExtra.Section title={hasBadges ? notificationLabel(total) : "No notifications"}>
          {badged.map((tile, index) => (
            <AppItem key={`${tile.name}-${index}`} tile={tile} darkMode={darkMode} />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
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

/**
 * Open the app at the tile's AXURL; if that is missing or fails, click its Dock tile instead.
 * Menu bar commands have no Raycast window for a toast, so a failed fallback is reported via HUD.
 */
async function openDockApp(tile: DockTile): Promise<void> {
  if (tile.path) {
    try {
      await open(tile.path);
      return;
    } catch {
      // Fall through to the Dock tile.
    }
  }
  try {
    await clickDockTile(tile.name);
  } catch (error) {
    const reason = isAccessibilityError(error)
      ? "Raycast needs Accessibility permission"
      : "its Dock tile could not be clicked";
    await showHUD(`Couldn't open ${tile.name}: ${reason}`);
  }
}

function AppItem({ tile, darkMode }: { tile: DockTile; darkMode: boolean }) {
  return (
    <MenuBarExtra.Item
      title={tile.name}
      subtitle={tile.badge}
      icon={tile.path ? { fileIcon: tile.path } : menuIcon(Icon.AppWindow, darkMode)}
      onAction={() => openDockApp(tile)}
    />
  );
}
