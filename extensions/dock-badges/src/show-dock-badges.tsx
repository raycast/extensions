import {
  Application,
  Color,
  Icon,
  Image,
  Keyboard,
  MenuBarExtra,
  getApplications,
  getPreferenceValues,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AccessibilityError, DockTile, clickDockTile, readDockTiles, readSystemDarkMode } from "./dock";

interface DockApp {
  tile: DockTile;
  application?: Application;
}

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

// Dock tiles that are never applications.
const NON_APP_TILES = new Set(["Downloads", "Trash", "Applications", "Documents"]);

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

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

function resolveApps(tiles: DockTile[], applications: Application[]): DockApp[] {
  return tiles
    .filter((tile) => !NON_APP_TILES.has(tile.name))
    .map((tile) => ({ tile, application: applications.find((a) => sameName(a.name, tile.name)) }));
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences.ShowDockBadges>();

  const { data, isLoading, error, revalidate } = useCachedPromise(readDockTiles, [], {
    keepPreviousData: true,
  });
  const { data: applications } = useCachedPromise(getApplications, [], { keepPreviousData: true });
  const { data: darkMode = false } = useCachedPromise(readSystemDarkMode, [], { keepPreviousData: true });

  const badged = resolveApps(data ?? [], applications ?? []).filter((app) => app.tile.count > 0);
  const total = badged.reduce((sum, app) => sum + app.tile.count, 0);
  const hasBadges = total > 0;

  if (preferences.hideWhenClear && data && !error && !hasBadges) {
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
        <MenuBarExtra.Section title={hasBadges ? `${total} notification${total === 1 ? "" : "s"}` : "No notifications"}>
          {badged.map((app) => (
            <AppItem key={app.tile.name} app={app} darkMode={darkMode} />
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

/** Open the matched app; if that fails (unmatched or unusual bundle), click its Dock tile instead. */
async function openDockApp({ tile, application }: DockApp): Promise<void> {
  try {
    await open(application?.path ?? `/Applications/${tile.name}.app`);
  } catch {
    await clickDockTile(tile.name);
  }
}

function AppItem({ app, darkMode }: { app: DockApp; darkMode: boolean }) {
  const { tile, application } = app;
  return (
    <MenuBarExtra.Item
      title={tile.name}
      subtitle={tile.badge}
      icon={application ? { fileIcon: application.path } : menuIcon(Icon.AppWindow, darkMode)}
      onAction={() => openDockApp(app)}
    />
  );
}
