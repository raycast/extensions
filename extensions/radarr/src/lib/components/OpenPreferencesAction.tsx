import React from "react";
import { Action, Icon, openExtensionPreferences } from "@raycast/api";

interface OpenPreferencesActionProps {
  title?: string;
}

/**
 * Opens the extension preferences through the Raycast API instead of a
 * `raycast://` deeplink, so the action works on both macOS and Windows.
 */
export function OpenPreferencesAction({ title = "Open Preferences" }: OpenPreferencesActionProps) {
  return <Action title={title} icon={Icon.Gear} onAction={openExtensionPreferences} />;
}
