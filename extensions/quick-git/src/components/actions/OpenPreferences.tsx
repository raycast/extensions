import { Action, openExtensionPreferences } from "@raycast/api";

export const OpenPreferences = () => {
  return <Action title="Open Preferences" onAction={openExtensionPreferences} />;
};
