import { Cache, launchCommand, LaunchType, Toast, showToast } from "@raycast/api";

const cache = new Cache();
const CACHE_KEY = "keyboardLockStatus";
let lastUpdateTime = 0;
const UPDATE_COOLDOWN = 1000; // 1 second cooldown between updates

async function updateMenuBar() {
  const now = Date.now();
  if (now - lastUpdateTime < UPDATE_COOLDOWN) {
    return; // Skip if we've updated too recently
  }

  try {
    await launchCommand({ name: "keyboard-status", type: LaunchType.Background });
    lastUpdateTime = now;
  } catch (error) {
    console.error("Failed to update menu bar:", error);
  }
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function setKeyboardLocked(isLocked: boolean) {
  cache.set(CACHE_KEY, isLocked ? "true" : "false");
  await updateMenuBar();
  await showToast({
    title: isLocked ? "Keyboard Locked" : "Keyboard Unlocked",
    style: Toast.Style.Success,
  });
}

export function isKeyboardLocked(): boolean {
  return cache.get(CACHE_KEY) === "true";
}
