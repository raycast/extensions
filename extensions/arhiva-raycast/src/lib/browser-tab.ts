import { BrowserExtension, environment } from "@raycast/api";

import { isHttpUrlString } from "./utils";

export type CurrentTab = Readonly<{
  url: string;
  title?: string;
}>;

async function getActiveBrowserTab() {
  const activeTab = (await BrowserExtension.getTabs()).find((tab) => tab.active);
  if (activeTab?.url == null || !isHttpUrlString(activeTab.url)) {
    return null;
  }

  return {
    url: activeTab.url,
    title: activeTab.title,
  } satisfies CurrentTab;
}

export async function getCurrentBrowserTabIfAvailable() {
  if (!environment.canAccess(BrowserExtension)) {
    return null;
  }

  return await getActiveBrowserTab();
}

export async function getCurrentBrowserTab() {
  if (!environment.canAccess(BrowserExtension)) {
    throw new Error("Install the Raycast Browser Extension to save the current browser tab.");
  }

  const currentTab = await getActiveBrowserTab();
  if (currentTab === null) {
    throw new Error("Could not find an active browser tab URL.");
  }

  return currentTab;
}
