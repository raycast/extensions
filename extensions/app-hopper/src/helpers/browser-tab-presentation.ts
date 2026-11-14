import { Icon, type List } from "@raycast/api";
import type { BrowserConfig, BrowserTab, BrowserWindow } from "../browsers/types";
import { describeChromiumTabTitle } from "../browsers/chromium-title";
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
  const label =
    browser.engine === "chromium"
      ? describeChromiumTabTitle(tab.title)
      : { title: tab.title, group: undefined, pinned: false };
  const accessories: List.Item.Accessory[] = [];
  if (label.pinned) accessories.push({ icon: Icon.Tack, tooltip: "Pinned" });
  if (label.group) {
    const characters = Array.from(label.group);
    const text = characters.length > 28 ? characters.slice(0, 27).join("") + "…" : label.group;
    accessories.push({ text, tooltip: label.group });
  }
  accessories.push(...getWindowAccessories(window));
  return {
    title: label.title || "Untitled Tab",
    subtitle: { value: formatTabUrl(tab.url), tooltip: tab.url },
    icon: {
      value: browser.appPath ? { fileIcon: browser.appPath } : Icon.Globe,
      tooltip: [browser.appName, window.title].filter(Boolean).join(" — "),
    },
    accessories,
  };
}
