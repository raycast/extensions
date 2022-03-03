import { ActionPanel, Action } from "@raycast/api";
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
      </ActionPanel.Section>
    </ActionPanel>
  );
}
