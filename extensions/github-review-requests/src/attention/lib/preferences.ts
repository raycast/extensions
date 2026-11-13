import { getPreferenceValues } from "@raycast/api";

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

export function menuBarPrefs(): Preferences.ActionablePullRequests {
  return getPreferenceValues<Preferences.ActionablePullRequests>();
}

/** The GitHub host to talk to; "" means the public API. */
export function host(): string {
  const h = (prefs().host ?? "").trim();
  return h === "github.com" ? "" : h;
}

/**
 * How many pull requests the menu bar lists inline before the rest move into
 * an overflow submenu. macOS menus get unwieldy long before they scroll.
 */
export function menuBarLimit(): number {
  const n = Number.parseInt((menuBarPrefs().menuBarLimit ?? "").trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return 15;
  return Math.min(n, 100);
}

/** How many PRs to load per category, clamped to a sane range. */
export function maxResults(): number {
  const n = Number.parseInt((prefs().maxResults ?? "").trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(n, 200);
}

/** Explicit selection; missing preferences retain the published PAT behavior. */
export function usesCli(): boolean {
  return prefs().authMethod === "gh";
}
