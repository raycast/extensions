import { Action, ActionPanel, Icon } from "@raycast/api";
import { ATTRIBUTION, CALENDAR_URL } from "./data";

export function NameActions({ names, extra }: { names: string[]; extra?: string }) {
  return (
    <ActionPanel>
      <Action.CopyToClipboard title="Copy Names" content={names.join(", ")} />
      {extra ? <Action.CopyToClipboard title="Copy Date" content={extra} /> : null}
      <Action.OpenInBrowser title="Open Full Calendar" url={CALENDAR_URL} icon={Icon.Calendar} />
      <Action.OpenInBrowser
        title="Data License (CC BY-SA 4.0)"
        url="https://creativecommons.org/licenses/by-sa/4.0/"
        icon={Icon.Info}
      />
      <Action.CopyToClipboard title="Copy Data Attribution" content={ATTRIBUTION} icon={Icon.Info} />
    </ActionPanel>
  );
}
