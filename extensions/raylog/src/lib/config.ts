import { getPreferenceValues } from "@raycast/api";
import type { TaskLogStatusBehavior } from "./types";

interface SharedPreferences {
  storageNotePath?: string;
}

interface ListTasksPreferences extends SharedPreferences {
  dueSoonDays?: string;
  showDueDateIndicator?: boolean;
  showPastDueIndicator?: boolean;
  showStartDateIndicator?: boolean;
  logStatusBehavior?: string;
}

export function getConfiguredStorageNotePath(): string | undefined {
  const preferences = getPreferenceValues<SharedPreferences>();
  const preferencePath = preferences.storageNotePath?.trim();
  return preferencePath || undefined;
}

export function getEnabledListMetadata(): {
  dueDate: boolean;
  pastDue: boolean;
  startDate: boolean;
} {
  const preferences = getPreferenceValues<ListTasksPreferences>();
  return {
    dueDate: preferences.showDueDateIndicator ?? true,
    pastDue: preferences.showPastDueIndicator ?? true,
    startDate: preferences.showStartDateIndicator ?? true,
  };
}

export function getDueSoonDays(): number {
  const preferences = getPreferenceValues<ListTasksPreferences>();
  const parsed = Number.parseInt(preferences.dueSoonDays ?? "7", 10);

  if (Number.isNaN(parsed)) {
    return 7;
  }

  return Math.max(0, parsed);
}

export function getTaskLogStatusBehavior(): TaskLogStatusBehavior {
  const preferences = getPreferenceValues<ListTasksPreferences>();

  switch (preferences.logStatusBehavior) {
    case "keep_status":
      return "keep_status";
    case "prompt":
      return "prompt";
    default:
      return "auto_start";
  }
}
