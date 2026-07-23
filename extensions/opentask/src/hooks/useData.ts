import { LaunchType, launchCommand } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { getLabels, getOpenTasks, getProjects, getUserSettings } from "../api";

export function useOpenTasks() {
  return useCachedPromise(getOpenTasks, [], { keepPreviousData: true });
}

export function useProjects() {
  return useCachedPromise(getProjects, [], { keepPreviousData: true });
}

export function useLabels() {
  return useCachedPromise(getLabels, [], { keepPreviousData: true });
}

export function useUserSettings() {
  return useCachedPromise(getUserSettings, [], { keepPreviousData: true });
}

// Keep the menu bar in sync after mutations. Fails silently when the
// menu bar command is deactivated.
export async function refreshMenuBar() {
  try {
    await launchCommand({ name: "menu-bar", type: LaunchType.Background });
  } catch {
    // menu bar command is not activated
  }
}
