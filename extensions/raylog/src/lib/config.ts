import { getPreferenceValues } from "@raycast/api";
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
  const parsed = Number.parseInt(preferences.dueSoonDays ?? "7", 10);

  if (Number.isNaN(parsed)) {
    return 7;
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
