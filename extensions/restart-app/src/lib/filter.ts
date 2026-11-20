import { ActivationPolicy } from "./types.ts";
import type { RawRunningApp, RestartableApp } from "./types.ts";

/** Raycast itself (any channel) must never be restarted from inside Raycast. */
const RAYCAST_BUNDLE_ID = /^com\.raycast[.-]/i;

/** Finder and shell UI processes that macOS relaunches on its own or that are not user apps. */
const EXCLUDED_BUNDLE_IDS = new Set(
  [
    "com.apple.finder",
    "com.apple.dock",
    "com.apple.systemuiserver",
    "com.apple.controlcenter",
    "com.apple.notificationcenterui",
    "com.apple.loginwindow",
    "com.apple.spotlight",
    "com.apple.windowmanager",
    "com.apple.windowserver",
    "com.apple.textinputmenuagent",
    "com.apple.textinputswitcher",
    "com.apple.universalcontrol",
    "com.apple.wallpaper.agent",
    "com.apple.coreservices.uiagent",
  ].map((id) => id.toLowerCase()),
);

/** Locations that only contain OS components and background helpers. */
const SYSTEM_PATH_PREFIXES = [
  "/System/Library/",
  "/Library/Apple/",
  "/usr/",
  "/bin/",
  "/sbin/",
  "/Library/Developer/CommandLineTools/",
];

/** Transient helpers launched from caches, e.g. Sparkle's Updater.app. */
const HELPER_PATH_SEGMENTS = ["/Library/Caches/", "/.Trash/"];

function trimTrailingSlash(path: string): string {
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

/**
 * Returns why an app is excluded from the list, or null when it can be restarted.
 * Exposed separately so the rules are easy to test and reason about.
 */
export function exclusionReason(app: RawRunningApp): string | null {
  if (app.terminated) return "terminated";
  if (!Number.isInteger(app.pid) || app.pid <= 0) return "invalid pid";
  if (app.activationPolicy !== ActivationPolicy.Regular && app.activationPolicy !== ActivationPolicy.Accessory) {
    return "background process";
  }
  if (!app.bundleId) return "no bundle identifier";
  if (!app.bundlePath || !app.executablePath) return "no bundle location";

  const bundleId = app.bundleId.toLowerCase();
  if (RAYCAST_BUNDLE_ID.test(bundleId)) return "Raycast";
  if (EXCLUDED_BUNDLE_IDS.has(bundleId)) return "system UI";

  const bundlePath = trimTrailingSlash(app.bundlePath);
  if (!bundlePath.startsWith("/") || !bundlePath.toLowerCase().endsWith(".app")) return "not an app bundle";
  // Helpers embedded in another bundle, e.g. Foo.app/Contents/Frameworks/Foo Helper.app
  if (bundlePath.slice(0, -".app".length).includes(".app/") || bundlePath.includes("/Contents/")) {
    return "embedded helper";
  }
  if (SYSTEM_PATH_PREFIXES.some((prefix) => bundlePath.startsWith(prefix))) return "system component";
  if (HELPER_PATH_SEGMENTS.some((segment) => bundlePath.includes(segment))) return "transient helper";
  if (!app.executablePath.startsWith(`${bundlePath}/`)) return "executable outside bundle";

  return null;
}

export function toRestartableApp(app: RawRunningApp): RestartableApp | null {
  if (exclusionReason(app) !== null) return null;
  const bundlePath = trimTrailingSlash(app.bundlePath as string);
  const fallbackName = bundlePath.slice(bundlePath.lastIndexOf("/") + 1, -".app".length);
  return {
    pid: app.pid,
    name: app.name?.trim() || fallbackName,
    bundleId: app.bundleId as string,
    bundlePath,
    executablePath: app.executablePath as string,
    kind: app.activationPolicy === ActivationPolicy.Accessory ? "accessory" : "regular",
  };
}

/** Filters a raw snapshot down to restartable apps, sorted by name, bundle path, then PID. */
export function selectRestartableApps(apps: readonly RawRunningApp[]): RestartableApp[] {
  return apps
    .map(toRestartableApp)
    .filter((app): app is RestartableApp => app !== null)
    .sort(
      (a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) ||
        a.bundlePath.localeCompare(b.bundlePath) ||
        a.pid - b.pid,
    );
}

/** Key used for the per-bundle busy guard; all instances of a bundle share it. */
export function bundleKey(app: Pick<RestartableApp, "bundleId">): string {
  return app.bundleId.toLowerCase();
}

/** Number of listed instances per bundle, used to disambiguate duplicates by PID. */
export function countInstances(apps: readonly RestartableApp[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const app of apps) counts.set(bundleKey(app), (counts.get(bundleKey(app)) ?? 0) + 1);
  return counts;
}
