import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_DUE_SOON_DAYS } from "./tasks";
import type { TaskLogStatusBehavior } from "./types";

export function getConfiguredStorageNotePath(): string | undefined {
  const preferences = getPreferenceValues<Preferences>();
  const preferencePath = preferences.storageNotePath?.trim();
  return preferencePath || undefined;
}

export function getEnabledListMetadata(): {
  dueDate: boolean;
  pastDue: boolean;
  startDate: boolean;
} {
  const preferences = getPreferenceValues<Preferences.ListTasks>();
  return {
    dueDate: preferences.showDueDateIndicator ?? true,
    pastDue: preferences.showPastDueIndicator ?? true,
    startDate: preferences.showStartDateIndicator ?? true,
  };
}

export function getDueSoonDays(): number {
  const preferences = getPreferenceValues<Preferences.ListTasks>();
  // Raycast normally supplies the manifest default. This fallback keeps CLI
  // tests and unusual preference states aligned with the same product default.
  const parsed = Number.parseInt(String(preferences.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS), 10);

  if (Number.isNaN(parsed)) {
    return DEFAULT_DUE_SOON_DAYS;
  }

  return Math.max(0, parsed);
}

export function getTaskLogStatusBehavior(): TaskLogStatusBehavior {
  const preferences = getPreferenceValues<Preferences.ListTasks>();

  switch (preferences.logStatusBehavior) {
    case "keep_status":
      return "keep_status";
    case "prompt":
      return "prompt";
    default:
      return "auto_start";
  }
}
