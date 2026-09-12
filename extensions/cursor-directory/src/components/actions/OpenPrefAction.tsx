import { Action, Icon, openExtensionPreferences } from "@raycast/api";

export const OpenPrefAction = () => {
  return <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />;
};
