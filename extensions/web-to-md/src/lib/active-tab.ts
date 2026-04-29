import { BrowserExtension, environment } from "@raycast/api";
import { looksLikeUrl } from "./url";

export type ActiveTab = {
  url: string;
  title?: string;
};

export class BrowserExtensionMissingError extends Error {
  constructor() {
    super("Install the Raycast Browser Extension to read the active tab.");
    this.name = "BrowserExtensionMissingError";
  }
}

export class NoActiveTabError extends Error {
  constructor() {
    super("No active browser tab with a valid http(s) URL was found.");
    this.name = "NoActiveTabError";
  }
}

export async function getActiveTab(): Promise<ActiveTab> {
  if (!environment.canAccess(BrowserExtension)) {
    throw new BrowserExtensionMissingError();
  }

  const tabs = await BrowserExtension.getTabs();
  const activeTab = tabs.find(
    (tab) => tab.active && tab.url && looksLikeUrl(tab.url),
  );

  if (!activeTab?.url) {
    throw new NoActiveTabError();
  }

  return { url: activeTab.url, title: activeTab.title };
}
