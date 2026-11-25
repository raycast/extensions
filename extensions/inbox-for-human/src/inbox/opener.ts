import { existsSync } from "node:fs";

/**
 * Minimal structural type for the `secondaryApp` preference, mirroring
 * @raycast/api's `Application` shape (name/path/bundleId) without importing
 * the runtime — tests need this module loadable outside Raycast.
 */
type AppPref = {
  name?: string;
  path?: string;
  bundleId?: string;
};

export type OpenerPrefs = {
  secondaryApp?: AppPref;
};

/**
 * What ⌘O does for one entry:
 * - `url`: open Obsidian's deep link (file inside a vault, Obsidian installed)
 * - `app`: open the file in the app chosen in settings
 * - `pick`: show Raycast's list of apps that can open the file
 */
export type SecondaryOpenTarget =
  | { kind: "url"; url: string; appName: string }
  | { kind: "app"; appPath: string; appName: string; path: string }
  | { kind: "pick"; path: string };

const OBSIDIAN_BUNDLE_ID = "md.obsidian";
const OBSIDIAN_NAME = "Obsidian";

function isObsidian(app: AppPref): boolean {
  return app.bundleId === OBSIDIAN_BUNDLE_ID || app.name === OBSIDIAN_NAME;
}

/**
 * Build an `obsidian://open` URI from an absolute path.
 *
 * Obsidian's own URI handler resolves a `path=` deep link against its
 * registered vault list itself, innermost-vault-wins, so there's no vault
 * name to compute here.
 */
export function obsidianUrl(absPath: string): string {
  return `obsidian://open?path=${encodeURIComponent(absPath)}`;
}

/**
 * The target for the "Open With" (⌘O) action.
 *
 * Falls back to letting the user pick an app when the setting is cleared,
 * when the chosen app isn't on this Mac (Raycast may hand over the default
 * with no path, or a path that no longer exists), or when the chosen app is
 * Obsidian and the file sits outside every vault. The skill stamps
 * `obsidian_url` on an entry only when its file is inside a vault.
 */
export function secondaryOpenTarget(
  prefs: OpenerPrefs,
  entry: { path: string; obsidian_url?: string },
  appExists: (path: string) => boolean = existsSync,
): SecondaryOpenTarget {
  const app = prefs.secondaryApp;
  const pick: SecondaryOpenTarget = { kind: "pick", path: entry.path };
  if (!app || !app.path || !appExists(app.path)) return pick;

  if (isObsidian(app)) {
    if (!entry.obsidian_url) return pick;
    return { kind: "url", url: obsidianUrl(entry.path), appName: app.name ?? OBSIDIAN_NAME };
  }

  return { kind: "app", appPath: app.path, appName: app.name ?? "App", path: entry.path };
}
