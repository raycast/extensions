import { Action, ActionPanel, Color, Detail, getPreferenceValues, openCommandPreferences } from "@raycast/api";

export const NoApiKey = () => {
  const { token, steamid } = getPreferenceValues();
  const markdown =
    "To access your games, you need to set your API key and Steam ID in the preferences.\n\nGrab an API key from Steam here: \n\n[https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)\n\nTo find your Steam ID, visit this page and look toward the top just under your user name.\n\n[https://store.steampowered.com/account/](https://store.steampowered.com/account/)\n\n\nPress `Enter` to continue";
  return (
    <Detail
      markdown={markdown}
      navigationTitle="Missing or incorrect credentials"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Api Key">
            {token ? (
              <Detail.Metadata.TagList.Item text="OK" color={Color.Green} />
            ) : (
              <Detail.Metadata.TagList.Item text="Not set" color={Color.Red} />
            )}
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Steam ID">
            {steamid ? (
              <Detail.Metadata.TagList.Item text="OK" color={Color.Green} />
            ) : (
              <Detail.Metadata.TagList.Item text="Not set" color={Color.Red} />
            )}
          </Detail.Metadata.TagList>
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" onAction={openCommandPreferences} />
        </ActionPanel>
      }
    />
  );
};
