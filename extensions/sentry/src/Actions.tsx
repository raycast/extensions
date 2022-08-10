import { Action, ActionPanel } from "@raycast/api";
import { Issue } from "./types";

export function Actions(props: { issue: Issue }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={props.issue.permalink} />
      </ActionPanel.Section>
      <ActionPanel.Section>
        <Action.CopyToClipboard
          title="Copy Link"
          content={props.issue.permalink}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action.CopyToClipboard
          title="Copy Short ID"
          content={props.issue.shortId}
          shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
