import { LocalStorage } from "@raycast/api";
import { visibilityForLaunch } from "./domain/menu-bar-visibility";

const VISIBILITY_KEY = "reset-forecast-menu-bar-visible";

export async function initializeMenuBarVisibility(launchType: "userInitiated" | "background"): Promise<boolean> {
  const storedVisibility = await LocalStorage.getItem<string>(VISIBILITY_KEY);
  const isVisible = visibilityForLaunch(storedVisibility, launchType);
  if (storedVisibility !== String(isVisible)) await setMenuBarVisibility(isVisible);
  return isVisible;
}

export async function setMenuBarVisibility(isVisible: boolean): Promise<void> {
  await LocalStorage.setItem(VISIBILITY_KEY, String(isVisible));
}
