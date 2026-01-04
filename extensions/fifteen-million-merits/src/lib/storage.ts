import { getPreferenceValues, LaunchType, LocalStorage, launchCommand, open, showHUD } from "@raycast/api";

export const STORAGE_KEY = "fifteen-million-merits";

export async function getCount(): Promise<number> {
  const storedValue = await LocalStorage.getItem(STORAGE_KEY);
  return typeof storedValue === "number" ? storedValue : 0;
}

export async function setCount(count: number): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, Math.max(0, count));
}

export async function refreshMenuBar() {
  try {
    await launchCommand({
      name: "show-ai-agent-sessions-counter",
      type: LaunchType.Background,
    });
  } catch (error) {
    console.error("Failed to refresh menu bar:", error);
  }
}

export async function handleFocusMode(newCount: number): Promise<void> {
  const { focusGoal, focusCategories } = getPreferenceValues<Preferences>();

  if (newCount === 0) {
    const encodedGoal = encodeURIComponent(focusGoal);
    const focusUrl = `raycast://focus/start?goal=${encodedGoal}&categories=${focusCategories}`;
    await open(focusUrl);
    await showHUD(`No active AI Agent sessions. Activating Focus: ${focusGoal}`);
  } else {
    const completeUrl = `raycast://focus/complete`;
    await open(completeUrl);
    await showHUD(`${newCount} AI Agent sessions active. Deactivating Focus.`);
  }
}

export async function updateCounterAndFocus(delta: number): Promise<number> {
  const currentCount = await getCount();
  const newCount = Math.max(0, currentCount + delta);

  await setCount(newCount);
  await refreshMenuBar();
  await handleFocusMode(newCount);

  return newCount;
}

export async function resetCounterAndFocus() {
  await setCount(0);
  await refreshMenuBar();
  await handleFocusMode(0);
}
