import { Application, open, showHUD } from "@raycast/api";
import { useEffect } from "react";
import { useLocalStorage } from "@raycast/utils";
import { DockTile, clickDockTile, isAccessibilityError } from "./dock";

export const ACCESSIBILITY_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility";

function sameName(a: string, b: string): boolean {
  return a.localeCompare(b, undefined, { sensitivity: "accent" }) === 0;
}

/**
 * The app bundle behind a tile, for its icon and for opening it. The Dock usually exposes the exact
 * path. Without one, installed apps matching the tile's name are used: the first supplies the icon,
 * but opening by path only happens when the match is unique, since `open` would otherwise succeed on
 * whichever came first. openPath is only the fallback when the Dock tile itself can't be clicked.
 */
export function resolvePaths(
  tile: DockTile,
  applications: Application[] | undefined,
): { iconPath?: string; openPath?: string } {
  if (tile.path) return { iconPath: tile.path, openPath: tile.path };
  const matches = applications?.filter((application) => sameName(application.name, tile.name)) ?? [];
  return { iconPath: matches[0]?.path, openPath: matches.length === 1 ? matches[0].path : undefined };
}

/**
 * Click the app's own Dock tile, so the exact running instance comes forward. If the tile can't be
 * clicked (say the app has quit since the Dock was read), open the app bundle instead. A failure is
 * reported via HUD, since the menu bar command has no Raycast window for a toast.
 */
export async function openDockApp(tile: DockTile, path?: string): Promise<void> {
  let clickError: unknown;
  try {
    await clickDockTile(tile);
    return;
  } catch (error) {
    clickError = error;
  }
  if (path) {
    try {
      await open(path);
      return;
    } catch {
      // Report the failure below.
    }
  }
  const reason = isAccessibilityError(clickError)
    ? "Raycast needs Accessibility permission"
    : "its Dock tile could not be clicked";
  await showHUD(`Couldn't open ${tile.name}: ${reason}`);
}

/**
 * How a tile is identified in the ignore list: its bundle identifier, so a beta and a release that share
 * a name can be ignored separately, or its name when the Dock doesn't expose the bundle.
 */
function ignoreKey(tile: DockTile): string {
  return tile.bundleId ?? tile.name;
}

/**
 * The initial release saved names in the ignore list. Rewrites each name that matches Dock tiles to those
 * tiles' bundle identifiers, as it ignored every tile with that name. Names of apps not in the Dock are
 * kept until they appear. Returns undefined when there is nothing to migrate.
 */
function migrateNames(stored: string[], tiles: DockTile[]): string[] | undefined {
  const bundleIds = new Set(tiles.map((tile) => tile.bundleId));
  const next = new Set<string>();
  let changed = false;
  for (const entry of stored) {
    const named = bundleIds.has(entry) ? [] : tiles.filter((tile) => tile.bundleId && tile.name === entry);
    if (named.length > 0) {
      named.forEach((tile) => next.add(ignoreKey(tile)));
      changed = true;
    } else {
      next.add(entry);
    }
  }
  return changed ? [...next] : undefined;
}

/**
 * Dock apps whose badges are left out of the menu bar count, shared by both commands via LocalStorage.
 * Pass the tiles read from the Dock so name entries from the initial release are migrated; until then a
 * name entry still matches by name. Only Dock tiles can be toggled, so writes happen after migration.
 */
export function useIgnoredApps(tiles: DockTile[] | undefined) {
  const { value, setValue, isLoading } = useLocalStorage<string[]>("ignored-apps", []);
  const ignored = new Set(value ?? []);

  useEffect(() => {
    if (isLoading || !value || !tiles) return;
    const migrated = migrateNames(value, tiles);
    if (migrated) setValue(migrated);
  }, [isLoading, value, tiles]);

  return {
    isLoading,
    isIgnored: (tile: DockTile) => ignored.has(ignoreKey(tile)) || ignored.has(tile.name),
    setIgnored: (tile: DockTile, ignore: boolean) => {
      const next = new Set(ignored);
      if (ignore) next.add(ignoreKey(tile));
      else next.delete(ignoreKey(tile));
      return setValue([...next]);
    },
  };
}
