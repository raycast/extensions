import { Action, ActionPanel, Color, Detail, getPreferenceValues, Icon, openExtensionPreferences } from "@raycast/api";
import { useKeyRejected } from "./lib/hooks";

export const WebApiKeyNotice = ({ onContinue }: { onContinue?: () => void }) => {
  const { token, steamid } = getPreferenceValues<Preferences>();
  const rejected = useKeyRejected();
  const markdown = [
    ...(rejected
      ? ["## Steam Rejected Your Web API Key"]
      : [
          "## Add a Steam Web API Key",
          "A key unlocks:",
          "",
          "- Fast search from a local list of every Steam game",
          "- Search Users",
          "- Your games and recently played games (with your Steam ID)",
          "- Raycast AI answers about your library",
        ]),
    "",
    "Get a key here:",
    "",
    "[https://steamcommunity.com/dev/apikey](https://steamcommunity.com/dev/apikey)",
    "",
    "Then add it to the extension preferences page. Your Steam ID is on [store.steampowered.com/account](https://store.steampowered.com/account/).",
  ].join("\n");

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Steam Web API Key"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Web API Key">
            {rejected ? (
              <Detail.Metadata.TagList.Item text="Rejected" color={Color.Red} />
            ) : token ? (
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
          <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
          {onContinue ? <Action icon={Icon.ArrowRight} title="Not Now" onAction={onContinue} /> : null}
        </ActionPanel>
      }
    />
  );
};
