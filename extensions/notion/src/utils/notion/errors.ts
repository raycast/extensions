import { APIErrorCode, isNotionClientError } from "@notionhq/client";
import { LaunchType, launchCommand, openExtensionPreferences, showToast, Toast } from "@raycast/api";

import { notionService } from "./oauth";

export function openConnectionSettings() {
  return launchCommand({ name: "manage-connection", type: LaunchType.UserInitiated });
}

export function showNotionError(error: unknown, title: string) {
  if (isNotionClientError(error) && error.code === APIErrorCode.Unauthorized) {
    const usesSecret = !!notionService.personalAccessToken;
    return showToast({
      style: Toast.Style.Failure,
      title: "Notion access is no longer valid",
      message: usesSecret
        ? "Update your Internal Integration Secret in preferences."
        : "Reconnect your Notion account.",
      primaryAction: {
        title: usesSecret ? "Open Extension Preferences" : "Manage Notion Connection",
        onAction: usesSecret ? openExtensionPreferences : openConnectionSettings,
      },
    });
  }

  return showToast({
    style: Toast.Style.Failure,
    title,
    message: error instanceof Error ? error.message : undefined,
  });
}
