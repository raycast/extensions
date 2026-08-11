import { LocalStorage } from "@raycast/api";
import { shouldShowMenuBar, visibilityAfterToggle } from "./domain/menu-bar-visibility";

const VISIBILITY_KEY = "reset-forecast-menu-bar-visible";

export async function initializeMenuBarVisibility(): Promise<boolean> {
  const storedVisibility = await LocalStorage.getItem<string>(VISIBILITY_KEY);

  if (storedVisibility === undefined) {
    await LocalStorage.setItem(VISIBILITY_KEY, "true");
  }

  return shouldShowMenuBar(storedVisibility);
}

export async function toggleMenuBarVisibility(): Promise<boolean> {
  const storedVisibility = await LocalStorage.getItem<string>(VISIBILITY_KEY);
  const isVisible = visibilityAfterToggle(storedVisibility);
  await LocalStorage.setItem(VISIBILITY_KEY, String(isVisible));
  return isVisible;
}
