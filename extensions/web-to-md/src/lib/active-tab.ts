import { BrowserExtension, environment } from "@raycast/api";
import { looksLikeUrl } from "./url";

export type ActiveTab = {
  url: string;
  title?: string;
  id?: number;
};

export type ActiveTabContent = ActiveTab & {
  html: string;
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
  const activeTab = tabs.find((tab) => tab.active && tab.url && looksLikeUrl(tab.url));

  if (!activeTab?.url) {
    throw new NoActiveTabError();
  }

  return { url: activeTab.url, title: activeTab.title, id: activeTab.id };
}

/**
 * The active tab plus its already-rendered HTML. Using the browser's own DOM
 * means pages behind a login or paywall, and pages rendered client-side,
 * convert correctly instead of being re-fetched anonymously.
 *
 * There can be one active tab per browser window, so the tab id is passed
 * explicitly — otherwise the URL and the content could come from different tabs.
 */
export async function getActiveTabContent(): Promise<ActiveTabContent> {
  const tab = await getActiveTab();
  const html = await BrowserExtension.getContent({
    format: "html",
    tabId: tab.id,
  });

  return { ...tab, html };
}
