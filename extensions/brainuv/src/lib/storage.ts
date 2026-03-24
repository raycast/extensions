import { launchCommand, LaunchType, LocalStorage } from "@raycast/api";
import type { State } from "./types";
import { EMPTY_STATE } from "./state";

const STATE_KEY = "brainuv-state";
const MENU_BAR_VISIBLE_KEY = "brainuv-menu-bar-visible";

export async function getState(): Promise<State> {
  try {
    const raw = await LocalStorage.getItem<string>(STATE_KEY);
    if (!raw) return EMPTY_STATE;
    return JSON.parse(raw) as State;
  } catch {
    return EMPTY_STATE;
  }
}

export async function setState(state: State): Promise<void> {
  await LocalStorage.setItem(STATE_KEY, JSON.stringify(state));
  // Refresh menu bar so it reflects the new active stream
  try {
    await launchCommand({
      name: "menu-bar",
      type: LaunchType.Background,
    });
  } catch {
    // Menu bar command may not be active — ignore
  }
}

export async function getMenuBarVisible(): Promise<boolean> {
  try {
    const raw = await LocalStorage.getItem<string>(MENU_BAR_VISIBLE_KEY);
    return raw !== "false";
  } catch {
    return true;
  }
}

export async function setMenuBarVisible(visible: boolean): Promise<void> {
  await LocalStorage.setItem(MENU_BAR_VISIBLE_KEY, visible ? "true" : "false");
}
