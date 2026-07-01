import { LocalStorage } from "@raycast/api";

const MENU_BAR_VISIBLE_KEY = "menu-bar-visible";

export async function isMenuBarVisible(): Promise<boolean> {
  const value = await LocalStorage.getItem<string>(MENU_BAR_VISIBLE_KEY);
  return value !== "false";
}

export async function setMenuBarVisible(isVisible: boolean): Promise<void> {
  await LocalStorage.setItem(MENU_BAR_VISIBLE_KEY, String(isVisible));
}

export async function toggleMenuBarVisible(): Promise<boolean> {
  const nextValue = !(await isMenuBarVisible());
  await setMenuBarVisible(nextValue);
  return nextValue;
}
