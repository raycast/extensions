import { Detail, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { Preferences } from "./types";

export default function ShowBoard() {
  const { username } = getPreferenceValues<Preferences>();

  const markdown = `![@${username}'s Holopin board](https://holopin.me/${username})`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            icon={Icon.Clipboard}
            title="Copy Board URL"
            content={`https://holopin.me/@${username}`}
          />
          <Action.OpenInBrowser
            icon={Icon.Globe}
            title="View Profile in browser"
            url={`https://holopin.io/@${username}`}
          />
        </ActionPanel>
      }
    />
  );
}
