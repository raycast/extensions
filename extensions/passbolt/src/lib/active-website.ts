import { BrowserExtension, environment } from "@raycast/api";
import { websiteHostname } from "../utils/totp";

export async function getActiveWebsiteUrl(launchUrl?: string): Promise<string | undefined> {
  if (launchUrl && websiteHostname(launchUrl)) return launchUrl;
  // Do not prompt for browser installation or permissions on every command launch.
  if (!environment.canAccess(BrowserExtension)) return undefined;

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const tabs = await Promise.race([
      BrowserExtension.getTabs(),
      new Promise<BrowserExtension.Tab[]>((resolve) => {
        timeout = setTimeout(() => resolve([]), 1000);
      }),
    ]);
    const active = tabs.filter((tab) => tab.active);
    // Multiple browser windows can each report an active tab; don't guess between them.
    return active.length === 1 && websiteHostname(active[0].url) ? active[0].url : undefined;
  } catch {
    return undefined;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
