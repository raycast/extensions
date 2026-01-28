import { ActionPanel, Action, Detail, openExtensionPreferences, popToRoot } from "@raycast/api";

export default function Command() {
  const markdown =
    "API key incorrect. Please update it in extension preferences and try again. Get more information on how to get your Matter token [here](https://www.raycast.com/zan/matter). Once you have your token, you can update it in the extension preferences by pressing enter.";

  function appReset() {
    openExtensionPreferences();
    popToRoot();
  }

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={appReset} />
        </ActionPanel>
      }
    />
  );
}
