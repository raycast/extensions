/**
 * Every link this extension opens lives in this file.
 *
 * Space Manager's URL scheme is not final yet. When it is, change SCHEME
 * below (one line). Until then the commands show a "not ready" message
 * instead of opening a broken link.
 *
 * Note: the shipped app already registers `spacemanager://` (used for its
 * sign-in callback). That may or may not become the scheme for these routes.
 */
export const SCHEME = "spacemanager";

export const BUNDLE_ID = "com.pangalin.spacemanager";
export const APP_NAME = "Pangalin Space Manager";
export const DOWNLOAD_URL = "https://pangalin.com/space-manager/?ref=raycast";

export const links = {
  dashboard: `${SCHEME}://open/dashboard`,
  scan: `${SCHEME}://scan`,
  reviewSafe: `${SCHEME}://review-safe`,
  find: (query: string) => `${SCHEME}://find?q=${encodeURIComponent(query)}`,
  page: (slug: PageSlug) => `${SCHEME}://open/${slug}`,
};

export type PageSlug =
  "dashboard" | "free-up-space" | "chat-app-media" | "apps" | "history" | "system-data" | "settings";

export const pages: { slug: PageSlug; title: string; subtitle: string }[] = [
  { slug: "dashboard", title: "Dashboard", subtitle: "What's taking up space" },
  { slug: "free-up-space", title: "Free Up Space", subtitle: "Items you can remove, rated safe, review or caution" },
  { slug: "chat-app-media", title: "Chat App Media", subtitle: "Photos and videos saved by chat apps" },
  { slug: "apps", title: "Apps", subtitle: "Apps and what they leave behind" },
  { slug: "history", title: "History", subtitle: "What you removed and when" },
  { slug: "system-data", title: "System Data", subtitle: "What makes up macOS's System Data" },
  { slug: "settings", title: "Settings", subtitle: "Space Manager settings" },
];

/** True until SCHEME is set to the real scheme. */
export function schemeIsPlaceholder(): boolean {
  return SCHEME.startsWith("<");
}
