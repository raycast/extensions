import { BrowserExtension, environment } from "@raycast/api";
import { websiteHostname, type ActiveWebsite } from "../utils/website";
export type { ActiveWebsite } from "../utils/website";

export async function getActiveWebsites(launchUrl?: string): Promise<ActiveWebsite[]> {
  if (launchUrl && websiteHostname(launchUrl)) return [{ url: launchUrl }];
  // Do not prompt for browser installation or permissions on every command launch.
  if (!environment.canAccess(BrowserExtension)) return [];

  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const tabs = await Promise.race([
      BrowserExtension.getTabs(),
      new Promise<BrowserExtension.Tab[]>((resolve) => {
        timeout = setTimeout(() => resolve([]), 1000);
      }),
    ]);
    const websites = new Map<string, ActiveWebsite>();
    for (const tab of tabs) {
      if (tab.active && /^https?:\/\//i.test(tab.url) && websiteHostname(tab.url) && !websites.has(tab.url)) {
        websites.set(tab.url, { url: tab.url, title: tab.title });
      }
    }
    return [...websites.values()];
  } catch {
    return [];
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function getActiveWebsiteUrl(launchUrl?: string): Promise<string | undefined> {
  const websites = await getActiveWebsites(launchUrl);
  return websites.length === 1 ? websites[0].url : undefined;
}
