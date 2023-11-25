import { Detail, ActionPanel, Action, Icon, getPreferenceValues } from "@raycast/api";
import { useHolopinAPI } from "./hooks/useHolopinAPI";
import { Preferences } from "./types";

export default function ShowBoard() {
  const { username } = getPreferenceValues<Preferences>();

  const { isLoading, data, revalidate } = useHolopinAPI(username);

  const markdown = isLoading ? "" : `![@${username}'s Holopin board](https://holopin.me/${username})`;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Board URL" content={`https://holopin.me/@${username}`} />
          <Action.OpenInBrowser title="View Profile in browser" url={`https://holopin.io/@${username}`} />
        </ActionPanel>
      }
    />
  );
}
