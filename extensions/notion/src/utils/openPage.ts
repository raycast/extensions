import { closeMainWindow, getPreferenceValues, open } from "@raycast/api";

import { Page } from "./notion/page";

export async function handleOnOpenPage(page: Page, setRecentPage: (page: Page) => Promise<void>): Promise<void> {
  if (!page.url) return;
  const open_in = getPreferenceValues<Preferences>().open_in;
  const url = urlForPreferredMethod(page.url, open_in);

  try {
    await openPageUrl(url, open_in);
  } catch {
    // Fallback: let the OS pick the handler (protocol handler for notion://,
    // default browser for https://).
    await open(url);
  }

  await setRecentPage(page);
  await closeMainWindow();
}

/**
 * Checks whether the given Application preference points to the Notion desktop app.
 */
export function isNotionApp(app?: Preferences["open_in"]): boolean {
  if (!app) return false;
  // Compare case-insensitively to handle localised or differently-cased names,
  // and also check the macOS bundle identifier for extra reliability.
  return app.name?.toLowerCase() === "notion" || app.bundleId === "notion.id";
}

export function urlForPreferredMethod(url: string, open_in?: Preferences["open_in"]) {
  if (!isNotionApp(open_in)) return url;
  // Create a deep link by replacing the scheme, keeping the rest of the URL
  // (host, path, query) unchanged.  This is the approach documented by Notion:
  // https://thomasjfrank.com/how-to-share-notion-links-that-open-directly-in-the-app/
  if (/^https:\/\/([a-z0-9-]+\.)?notion\.(so|com)\//i.test(url)) {
    return url.replace(/^https:\/\//i, "notion://");
  }
  return url;
}

/**
 * Opens a URL using the right strategy for its scheme:
 * - `notion://` deep links are handed to the OS protocol handler (no `app`
 *   argument), because on Windows `open(url, application)` launches the app
 *   but drops the URL for custom protocols (#30540).
 * - Other URLs are opened with the specified application.
 */
export async function openPageUrl(url: string, open_in?: Preferences["open_in"]): Promise<void> {
  if (url.startsWith("notion://")) {
    await open(url);
  } else {
    await open(url, open_in);
  }
}
