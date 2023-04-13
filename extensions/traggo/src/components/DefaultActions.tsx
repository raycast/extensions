import { Action, Icon, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { Preferences } from "../lib/types";

export const DefaultActions = () => {
  const { url } = getPreferenceValues<Preferences>();
  return (
    <>
      <Action.OpenInBrowser title="Open Traggo" url={url} icon={Icon.Globe} />
      <Action title="Open Extension Preferences" onAction={openExtensionPreferences} icon={Icon.Cog} />
    </>
  );
};
