import { Application, open, showHUD } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { DockTile, clickDockTile, isAccessibilityError } from "./dock";

export const ACCESSIBILITY_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

/**
 * Installed apps matching the tile's name. The first match supplies the icon. Opening by path only
 * happens when the match is unique: if several bundles share the name, `open` would succeed on
 * whichever came first, so the tile is clicked in the Dock instead (by name and ordinal), which
 * activates exactly what it shows.
 */
export function resolvePaths(
  tile: DockTile,
  applications: Application[] | undefined,
): { iconPath?: string; openPath?: string } {
  const matches = applications?.filter((application) => sameName(application.name, tile.name)) ?? [];
  return { iconPath: matches[0]?.path, openPath: matches.length === 1 ? matches[0].path : undefined };
}

/**
 * Open the uniquely matched app bundle; if there is none or it fails, click its Dock tile instead.
 * A failed fallback is reported via HUD, since the menu bar command has no Raycast window for a toast.
 */
export async function openDockApp(tile: DockTile, path?: string): Promise<void> {
  if (path) {
    try {
      await open(path);
      return;
    } catch {
      // Fall through to the Dock tile.
    }
  }
  try {
    await clickDockTile(tile.name, tile.ordinal);
  } catch (error) {
    const reason = isAccessibilityError(error)
      ? "Raycast needs Accessibility permission"
      : "its Dock tile could not be clicked";
    await showHUD(`Couldn't open ${tile.name}: ${reason}`);
  }
}

/**
 * Names of Dock apps whose badges are left out of the menu bar count. Stored by name, so ignoring
 * one of several same-named tiles ignores them all. Shared by both commands via LocalStorage.
 */
export function useIgnoredApps() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>("ignored-apps", []);
  const ignored = new Set(value ?? []);
  return {
    ignored,
    isLoading,
    setIgnored: (name: string, ignore: boolean) => {
      const next = new Set(ignored);
      if (ignore) next.add(name);
      else next.delete(name);
      return setValue([...next]);
    },
  };
}
