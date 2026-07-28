import type { LocalTab, RemoteTab } from "./types";

export function isStartPageTab(tab: Pick<LocalTab | RemoteTab, "title">) {
  return tab.title === "Start Page";
}

export function shouldHideTab(tab: Pick<LocalTab | RemoteTab, "title" | "url">) {
  return isStartPageTab(tab) || !tab.url;
}

export function getLocalTabApplicationTarget(tab: LocalTab, fallback: string) {
  return tab.app_path || tab.app_name || fallback;
}
