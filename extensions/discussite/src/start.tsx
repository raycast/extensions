/**
 * Open in Discussite command — no-view mode.
 *
 * Grabs the URL from the argument or active browser tab and
 * opens the matching Discussite Site immediately. No form, no extra steps.
 *
 * Usage:
 *   "Open in Discussite"                     → uses active browser tab URL
 *   "Open in Discussite https://example.com" → uses the provided URL
 */

import {
  BrowserExtension,
  closeMainWindow,
  open,
  showHUD,
  LaunchProps,
} from "@raycast/api";
import { normalizeSiteUrlInput } from "./lib/url-validation";
import { DS_BASE_URL } from "./config";

export default async function start(
  props: LaunchProps<{ arguments: Arguments.Start }>,
) {
  let url = props.arguments.url?.trim() || "";
  let browserTabLookupFailed = false;

  // If no argument, try the active browser tab
  if (!url) {
    try {
      const tabs = await BrowserExtension.getTabs();
      const activeTab = tabs.find((t) => t.active);
      if (activeTab?.url && activeTab.url.startsWith("https://")) {
        url = activeTab.url;
      }
    } catch {
      browserTabLookupFailed = true;
    }
  }

  if (!url) {
    await showHUD(
      browserTabLookupFailed
        ? "Pass a URL or install the Raycast Browser Extension"
        : "No URL found — open an HTTPS site first",
    );
    return;
  }

  const normalized = normalizeSiteUrlInput(url);
  if (!normalized.ok) {
    await showHUD(
      "error" in normalized ? normalized.error : "That URL is invalid.",
    );
    return;
  }

  const destination = new URL("/", DS_BASE_URL);
  destination.searchParams.set("url", normalized.normalizedUrl);

  await closeMainWindow();
  await open(destination.toString());
}
