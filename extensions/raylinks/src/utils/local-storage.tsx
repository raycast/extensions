import { RLLink } from "./types";
import { LocalStorage } from "@raycast/api";

const localStorageKey = "RLL-links";

// here we are storing all the links as a custom Array of items, each of type RLLink
export async function getStoredLinks(): Promise<Array<RLLink>> {
  return JSON.parse((await LocalStorage.getItem(localStorageKey)) || "[]");
}

export async function saveStoredLinks(links: Array<RLLink>): Promise<void> {
  await LocalStorage.setItem(localStorageKey, JSON.stringify(links));
}
