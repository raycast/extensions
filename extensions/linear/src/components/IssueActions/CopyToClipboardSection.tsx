import { ActionPanel, Action, Icon } from "@raycast/api";
import { IssueResult } from "../../api/getIssues";

export default function CopyToClipboardSection({ issue }: { issue: IssueResult }) {
  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard
        icon={Icon.Clipboard}
        content={issue.identifier}
        title="Copy Issue ID"
        shortcut={{ modifiers: ["cmd"], key: "." }}
      />

      <Action.CopyToClipboard
        icon={Icon.Clipboard}
        content={issue.url}
        title="Copy Issue URL"
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
      />

      <Action.CopyToClipboard
        icon={Icon.Clipboard}
        content={issue.title}
        title="Copy Issue Title"
        shortcut={{ modifiers: ["cmd", "shift"], key: "'" }}
      />

      <Action.CopyToClipboard
        icon={Icon.Clipboard}
        content={issue.branchName}
        title="Copy Git Branch Name"
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
    </ActionPanel.Section>
  );
}
