import { ActionPanel, Action, launchCommand, LaunchType } from "@raycast/api";
import type { PullRequest } from "./hooks/useSearch";

export function Actions(props: { pr: PullRequest }) {
  return (
    <ActionPanel title={props.pr.title}>
      <ActionPanel.Section>
        <Action.OpenInBrowser url={props.pr.url} />
        <Action.CopyToClipboard
          title="Copy Pull Request URL"
          content={props.pr.url}
          shortcut={{ modifiers: ["cmd"], key: "." }}
        />
        <Action
          title="Open Pull Request Attention"
          onAction={() => launchCommand({ name: "pull-requests", type: LaunchType.UserInitiated })}
        />
        <Action
          title="Open Activity Inbox"
          onAction={() => launchCommand({ name: "activity", type: LaunchType.UserInitiated })}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
