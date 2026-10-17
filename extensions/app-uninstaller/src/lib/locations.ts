import { homedir } from "os";
import { join } from "path";

const HOME = homedir();

/** Where an installed application bundle may live. */
export interface AppRoot {
  path: string;
  /** Sub-paths inside this root that are containers, not applications. */
  containers: string[];
}

export const APP_ROOTS: AppRoot[] = [
  { path: "/Applications", containers: ["Utilities", "Setapp"] },
  { path: "/Applications/Utilities", containers: [] },
  { path: "/Applications/Setapp", containers: [] },
  { path: join(HOME, "Applications"), containers: [] },
];

/**
 * A directory that third-party applications are known to write into.
 *
 * `depth` is how many levels below `path` an entry may sit and still be
 * considered a removable leftover. It is deliberately small: the deeper we
 * walk, the more likely a name collision is to hit an unrelated app's data.
 */
export interface SearchRoot {
  path: string;
  label: string;
  depth: number;
  scope: "user" | "system";
}

/**
 * `/private/var/db/receipts` is deliberately absent.
 *
 * An installer receipt is not a plain file to move: `pkgutil` keeps its own
 * database alongside the `.bom` and `.plist`, so removing them directly leaves
 * it inconsistent. Receipts are reported separately and cleared with
 * `pkgutil --forget`, which is the supported route.
 */
export const SEARCH_ROOTS: SearchRoot[] = [
  { path: join(HOME, "Library/Application Support"), label: "Application Support", depth: 2, scope: "user" },
  { path: join(HOME, "Library/Containers"), label: "Sandbox Container", depth: 1, scope: "user" },
  { path: join(HOME, "Library/Group Containers"), label: "Group Container", depth: 1, scope: "user" },
  { path: join(HOME, "Library/Caches"), label: "Cache", depth: 1, scope: "user" },
  { path: join(HOME, "Library/HTTPStorages"), label: "HTTP Storage", depth: 1, scope: "user" },
  { path: join(HOME, "Library/WebKit"), label: "WebKit Data", depth: 1, scope: "user" },
  { path: join(HOME, "Library/Preferences"), label: "Preferences", depth: 1, scope: "user" },
  { path: join(HOME, "Library/Preferences/ByHost"), label: "Preferences (ByHost)", depth: 1, scope: "user" },
  { path: join(HOME, "Library/Saved Application State"), label: "Saved State", depth: 1, scope: "user" },
  { path: join(HOME, "Library/Logs"), label: "Logs", depth: 2, scope: "user" },
  { path: join(HOME, "Library/Cookies"), label: "Cookies", depth: 1, scope: "user" },
  { path: join(HOME, "Library/Application Scripts"), label: "Application Scripts", depth: 1, scope: "user" },
  { path: join(HOME, "Library/LaunchAgents"), label: "Launch Agent", depth: 1, scope: "user" },
  { path: join(HOME, "Library/Internet Plug-Ins"), label: "Internet Plug-In", depth: 1, scope: "user" },
  { path: join(HOME, "Library/Services"), label: "Service", depth: 1, scope: "user" },
  { path: join(HOME, "Library/QuickLook"), label: "Quick Look Plug-In", depth: 1, scope: "user" },
  { path: join(HOME, "Library/Autosave Information"), label: "Autosave Data", depth: 1, scope: "user" },

  { path: "/Library/Application Support", label: "Application Support", depth: 2, scope: "system" },
  { path: "/Library/Caches", label: "Cache", depth: 1, scope: "system" },
  { path: "/Library/Preferences", label: "Preferences", depth: 1, scope: "system" },
  { path: "/Library/LaunchAgents", label: "Launch Agent", depth: 1, scope: "system" },
  { path: "/Library/LaunchDaemons", label: "Launch Daemon", depth: 1, scope: "system" },
  { path: "/Library/PrivilegedHelperTools", label: "Privileged Helper", depth: 1, scope: "system" },
  { path: "/Library/Extensions", label: "Kernel Extension", depth: 1, scope: "system" },
  { path: "/Library/Internet Plug-Ins", label: "Internet Plug-In", depth: 1, scope: "system" },
  { path: "/Library/QuickLook", label: "Quick Look Plug-In", depth: 1, scope: "system" },
];

export const HOMEBREW_CASKROOMS = ["/opt/homebrew/Caskroom", "/usr/local/Caskroom"];
