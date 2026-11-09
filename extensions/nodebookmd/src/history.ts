import { LocalStorage } from "@raycast/api";
import type { Hit } from "./types";

// ponytail: one JSON list in LocalStorage. A count of opens per page can rank it later.
const KEY = "recent-pages";
const MAX_PAGES = 20;

/** The pages opened from Raycast, newest first. */
export async function recentPages(): Promise<Hit[]> {
  try {
    return JSON.parse((await LocalStorage.getItem<string>(KEY)) ?? "[]");
  } catch {
    return [];
  }
}

/** Puts back a list read before a change, to undo it. */
export async function save(pages: Hit[]) {
  await LocalStorage.setItem(KEY, JSON.stringify(pages.slice(0, MAX_PAGES)));
}

export async function rememberPage(hit: Hit) {
  const page = { path: hit.path, title: hit.title, nodeType: hit.nodeType, icon: hit.icon };
  await save([page, ...(await recentPages()).filter((entry) => entry.path !== hit.path)]);
}

export async function forgetPage(path: string) {
  await save((await recentPages()).filter((entry) => entry.path !== path));
}

export async function clearHistory() {
  await LocalStorage.removeItem(KEY);
}
