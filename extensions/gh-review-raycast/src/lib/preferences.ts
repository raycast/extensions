import { getPreferenceValues } from "@raycast/api";

/** Extension-level preferences declared in package.json. */
export type ExtensionPrefs = {
  ghPath?: string;
  host?: string;
  maxResults?: string;
};

/** Preferences declared on the menu-bar command. */
export type MenuBarPrefs = ExtensionPrefs & {
  menuBarCategory?: string;
  hideWhenEmpty?: boolean;
  menuBarLimit?: string;
};

export function prefs(): ExtensionPrefs {
  return getPreferenceValues<ExtensionPrefs>();
}

export function menuBarPrefs(): MenuBarPrefs {
  return getPreferenceValues<MenuBarPrefs>();
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
