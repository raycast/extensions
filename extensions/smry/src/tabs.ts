import type { BrowserExtension } from "@raycast/api";
import { getHostname, normalizeArticleUrl } from "./smry";

export type BrowserTab = BrowserExtension.Tab;

export function readableTabTitle(tab: BrowserTab): string {
  return tab.title?.trim() || getHostname(tab.url) || "Untitled Page";
}

export function getActiveSupportedTab(tabs: BrowserTab[]): BrowserTab | undefined {
  return tabs.find((tab) => tab.active && normalizeArticleUrl(tab.url));
}

export function findMatchingTab(tabs: BrowserTab[], articleUrl: string): BrowserTab | undefined {
  const normalizedArticleUrl = normalizeArticleUrl(articleUrl);
  if (!normalizedArticleUrl) return undefined;
  return tabs.find((tab) => normalizeArticleUrl(tab.url) === normalizedArticleUrl);
}

export function supportedTabs(tabs: BrowserTab[]): BrowserTab[] {
  return tabs
    .filter((tab) => normalizeArticleUrl(tab.url))
    .sort((left, right) => Number(right.active) - Number(left.active));
}
