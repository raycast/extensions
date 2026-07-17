import type { LocalTab, RemoteTab } from "./types";

export function isStartPageTab(tab: Pick<LocalTab | RemoteTab, "title">) {
  return tab.title === "Start Page";
}

export function getLocalTabApplicationName(tab: LocalTab, fallback: string) {
  return tab.app_name || fallback;
}
