import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { useCallback } from "react";
import { usePreferences } from "./preferences.js";

export async function tryWithToast<T>(
  fn: () => Promise<T>,
  options: { success: string; failure: string },
): Promise<Awaited<T> | null> {
  try {
    const data = await fn();
    showToast({ title: options.success, style: Toast.Style.Success });
    return data;
  } catch (e) {
    showToast({
      title: options.failure,
      style: Toast.Style.Failure,
      message: e instanceof Error ? e.message : "Unknown error",
    });
    return null;
  }
}

const MESSAGES = {
  delete: ["Deleted", "delete"],
  create: ["Created", "create"],
  update: ["Updated", "update"],
  stop: ["Stopped", "stop"],
  start: ["Started", "start"],
  archive: ["Archived", "archive"],
  unarchive: ["Unarchived", "unarchive"],
} as const;
export function messageBuilder(action: keyof typeof MESSAGES, type: string, name = "") {
  const [success, failure] = MESSAGES[action];
  if (name) {
    name = `"${name}"`;
  }
  return {
    success: `${success} ${type} ${name}`.trim(),
    failure: `Failed to ${failure} ${type} ${name}`.trim(),
  };
}

export function usePreferredExit() {
  const preferences = usePreferences();

  return useCallback(() => {
    if (preferences.onTimeEntryAction === "stay") return;
    closeMainWindow();
  }, [preferences.onTimeEntryAction]);
}
