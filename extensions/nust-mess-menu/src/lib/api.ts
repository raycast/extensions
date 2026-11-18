import { useCachedPromise } from "@raycast/utils";
import type { Menu } from "./types";
import { MENU_URL } from "./urls";

export async function fetchMenu(): Promise<Menu> {
  const response = await fetch(MENU_URL);
  if (!response.ok) {
    throw new Error(`Couldn't load the menu. HTTP ${response.status}`);
  }
  return (await response.json()) as Menu;
}

export function useMenu(options?: { onError?: (error: Error) => void }) {
  return useCachedPromise(fetchMenu, [], options);
}
