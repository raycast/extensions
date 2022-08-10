import { Action, ActionPanel, Icon } from "@raycast/api";
import { IssueDetails } from "./IssueDetails";
import { Issue } from "./types";

export function Actions(props: { issue: Issue; isDetail?: boolean }) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        {!props.isDetail && (
          <Action.Push icon={Icon.Sidebar} title="Show Details" target={<IssueDetails issue={props.issue} />} />
        )}
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
