import { ActionPanel, Action, getPreferenceValues } from "@raycast/api";

import { IssueResult } from "../../api/getIssues";

type ISSUE_KEY = "title" | "identifier" | "url" | "branchName";

const variables: Record<string, ISSUE_KEY> = {
  ISSUE_TITLE: "title",
  ISSUE_ID: "identifier",
  ISSUE_URL: "url",
  ISSUE_BRANCH_NAME: "branchName",
};

export default function CopyToClipboardSection({ issue }: { issue: IssueResult }) {
  const { issueCustomCopyAction } = getPreferenceValues<Preferences>();

  return (
    <ActionPanel.Section>
      <Action.CopyToClipboard
        content={issue.identifier}
        title="Copy Issue ID"
        shortcut={{ modifiers: ["cmd"], key: "." }}
      />
      <Action.CopyToClipboard
        content={{
          html: `<a href="${issue.url}" title="${issue.title}">${issue.identifier}: ${issue.title}</a>`,
          text: issue.url,
        }}
        title="Copy Formatted Issue URL"
        shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
      />
      <Action.CopyToClipboard content={issue.url} title="Copy Issue URL" />
      <Action.CopyToClipboard
        content={issue.title}
        title="Copy Issue Title"
        shortcut={{ modifiers: ["cmd", "shift"], key: "'" }}
      />
      <Action.CopyToClipboard
        content={issue.branchName}
        title="Copy Git Branch Name"
        shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      />
      {issueCustomCopyAction && issueCustomCopyAction !== "" ? (
        <Action.CopyToClipboard
          content={issueCustomCopyAction?.replace(/\{(.*?)\}/g, (substring, variable) => {
            const value = issue[variables[variable]];
            return value ? value : substring;
          })}
          title="Custom Copy"
          shortcut={{ modifiers: ["cmd", "opt"], key: "." }}
        />
      ) : null}
    </ActionPanel.Section>
  );
}
