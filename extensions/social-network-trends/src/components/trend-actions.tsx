import { Action, ActionPanel, Icon } from "@raycast/api";
import { getLastRefreshTime, timeStampToDate } from "../utils/common-utils";
import { PreferenceActions } from "./preference-actions";

export function TrendActions(props: { url: string; name: string }) {
  const { url, name } = props;
  return (
    <ActionPanel>
      <Action.OpenInBrowser url={url} />
      <Action.CopyToClipboard
        icon={Icon.Clipboard}
        title={"Copy Trend Title"}
        shortcut={{ modifiers: ["cmd"], key: "t" }}
        content={name}
      />
      <Action.CopyToClipboard
        icon={Icon.Link}
        title={"Copy Trend Link"}
        shortcut={{ modifiers: ["cmd"], key: "l" }}
        content={url}
      />
      <Action icon={Icon.Repeat} title={`Last refresh at ${timeStampToDate(getLastRefreshTime())}`} />
      <PreferenceActions />
    </ActionPanel>
  );
}
