import { LocalStorage } from "@raycast/api";
import type { ActiveState, Demo } from "./types";

const DEMOS_KEY = "demo-snippet:demos";
const ACTIVE_STATE_KEY = "demo-snippet:active-state";

export async function getDemos(): Promise<Demo[]> {
  const raw = await LocalStorage.getItem<string>(DEMOS_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as Demo[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse demos", error);
    return [];
  }
}

export async function saveDemos(demos: Demo[]): Promise<void> {
  await LocalStorage.setItem(DEMOS_KEY, JSON.stringify(demos));
}

export async function getActiveState(): Promise<ActiveState | null> {
  const raw = await LocalStorage.getItem<string>(ACTIVE_STATE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as ActiveState;
    if (!parsed?.demoId || typeof parsed.index !== "number") {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse active state", error);
    return null;
  }
}

export async function setActiveState(state: ActiveState): Promise<void> {
  await LocalStorage.setItem(ACTIVE_STATE_KEY, JSON.stringify(state));
}

export async function clearActiveState(): Promise<void> {
  await LocalStorage.removeItem(ACTIVE_STATE_KEY);
}
