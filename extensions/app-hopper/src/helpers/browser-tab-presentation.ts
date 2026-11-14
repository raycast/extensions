import { Icon, type List } from "@raycast/api";
import type { BrowserConfig, BrowserTab, BrowserWindow } from "../browsers/types";
import { getWindowAccessories } from "./window-presentation";

export function formatTabUrl(rawUrl: string): string {
  if (!/^https?:\/\//i.test(rawUrl)) return rawUrl;
  try {
    const url = new URL(rawUrl);
    const host = url.host.replace(/^www\./i, "");
    return host + (url.pathname === "/" ? "" : url.pathname) + url.search + url.hash;
  } catch {
    return rawUrl;
  }
}

/** One row layout shared by root search, browser search, and nested tab lists. */
export function getBrowserTabProps(
  browser: BrowserConfig,
  window: BrowserWindow,
  tab: BrowserTab,
): Pick<List.Item.Props, "title" | "subtitle" | "icon" | "accessories"> {
  return {
    title: tab.title || "Untitled Tab",
    subtitle: { value: formatTabUrl(tab.url), tooltip: tab.url },
    icon: {
      value: browser.appPath ? { fileIcon: browser.appPath } : Icon.Globe,
      tooltip: [browser.appName, window.title].filter(Boolean).join(" — "),
    },
    accessories: getWindowAccessories(window),
  };
}
