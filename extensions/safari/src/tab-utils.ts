import type { LocalTab, RemoteTab } from "./types";

export function isStartPageTab(tab: Pick<LocalTab | RemoteTab, "title">) {
  return tab.title === "Start Page";
}
