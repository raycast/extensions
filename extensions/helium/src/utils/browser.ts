import { BrowserExtension, environment, showToast, Toast, open } from "@raycast/api";
import { Tab } from "../types";
import { listHeliumTabs } from "./applescript";

/**
 * Check if Browser Extension is available.
 *
 * Kept for other callers (e.g., `BrowserExtension.getContent`) that still
 * depend on the extension. The tab list itself no longer goes through the
 * BrowserExtension — see {@link getBrowserTabs}.
 */
export function isBrowserExtensionAvailable(): boolean {
  return environment.canAccess(BrowserExtension);
}

/**
 * Get all open tabs from Helium via AppleScript, enriched with favicons from
 * the Browser Extension when available.
 *
 * AppleScript is the source of truth for tab identity — it sees every tab
 * including ones Raycast's Browser Extension filters out (`file://` PDFs,
 * `chrome://` pages, empty new-tab pages, etc.). The Browser Extension is
 * called in parallel solely to pick up favicons (which AS doesn't expose);
 * these are attached by URL match. Tabs BE never sees (local files,
 * chrome://) simply have no favicon and the UI falls back to `Icon.Globe`.
 *
 * Each tab carries its Helium AS `id` as `heliumId`, which subsequent
 * actions use to target exact tabs (duplicate URLs included) via
 * {@link switchToHeliumTabById}/{@link closeHeliumTabById}.
 *
 * `Tab.id` here is a synthetic 1-indexed ordinal (from AS traversal order),
 * used only for React keys and optimistic-update tracking. It is not a Chrome
 * tab id and should not be treated as one.
 */
export async function getBrowserTabs(): Promise<Tab[]> {
  try {
    const [asTabs, beTabs] = await Promise.all([
      listHeliumTabs(),
      isBrowserExtensionAvailable() ? BrowserExtension.getTabs().catch(() => []) : Promise.resolve([]),
    ]);

    // URL -> favicon, sourced from BE (AS doesn't expose favicons). Same URL
    // implies same favicon, so a plain URL map suffices even for duplicates.
    const faviconByUrl = new Map<string, string>();
    for (const t of beTabs) {
      if (t.favicon && !faviconByUrl.has(t.url)) faviconByUrl.set(t.url, t.favicon);
    }

    return asTabs.map((t, i) => ({
      id: i + 1,
      url: t.url,
      title: t.title || "",
      favicon: faviconByUrl.get(t.url),
      active: false,
      heliumId: t.heliumId,
    }));
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Get Tabs",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return [];
  }
}

/**
 * Get tabs filtered by browser (optional)
 * You can filter for specific browsers if needed
 */
export async function getTabsByBrowser(browserName?: string): Promise<Tab[]> {
  const allTabs = await getBrowserTabs();

  if (!browserName) {
    return allTabs;
  }

  // Filter tabs by browser if needed
  // The Browser Extension API returns tabs from all supported browsers
  return allTabs;
}

/**
 * Open a URL in the default browser or specific application
 */
export async function openUrl(url: string, application?: string): Promise<void> {
  try {
    await open(url, application);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Open URL",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
