import { Action, ActionPanel, Detail, Icon, openExtensionPreferences } from "@raycast/api";

const InvalidTokenView = () => {
  return (
    <Detail
      markdown={`# ERROR \n\n Invalid token detected. Please set one in the settings.`}
      actions={
        <ActionPanel>
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
};

export default InvalidTokenView;
