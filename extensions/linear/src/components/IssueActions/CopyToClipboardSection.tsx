import { ActionPanel, Action, getPreferenceValues, Keyboard } from "@raycast/api";

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
        shortcut={{ macOS: { modifiers: ["cmd"], key: "." }, Windows: { modifiers: ["ctrl"], key: "." } }}
      />
      <Action.CopyToClipboard
        content={{
          html: `<a href="${issue.url}" title="${issue.title}">${issue.identifier}: ${issue.title}</a>`,
          text: issue.url,
        }}
        title="Copy Formatted Issue URL"
        shortcut={Keyboard.Shortcut.Common.CopyPath}
      />
      <Action.CopyToClipboard content={issue.url} title="Copy Issue URL" />
      <Action.CopyToClipboard
        content={issue.title}
        title="Copy Issue Title"
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "'" },
          Windows: { modifiers: ["ctrl", "shift"], key: "'" },
        }}
      />
      <Action.CopyToClipboard
        content={issue.branchName}
        title="Copy Git Branch Name"
        shortcut={Keyboard.Shortcut.Common.CopyName}
      />
      {issueCustomCopyAction && issueCustomCopyAction !== "" ? (
        <Action.CopyToClipboard
          content={issueCustomCopyAction?.replace(/\{(.*?)\}/g, (substring, variable) => {
            const value = issue[variables[variable]];
            return value ? value : substring;
          })}
          title="Custom Copy"
          shortcut={{
            macOS: { modifiers: ["cmd", "opt"], key: "." },
            Windows: { modifiers: ["ctrl", "alt"], key: "." },
          }}
        />
      ) : null}
    </ActionPanel.Section>
  );
}
