import { ActionPanel, Action, Clipboard, getPreferenceValues, Icon, Keyboard, showToast, Toast } from "@raycast/api";

import { getIssuePromptData, IssueResult } from "../../api/getIssues";
import { getErrorMessage } from "../../helpers/errors";
import { getIssuePrompt } from "../../helpers/prompts";

type ISSUE_KEY = "title" | "identifier" | "url" | "branchName";

const variables: Record<string, ISSUE_KEY> = {
  ISSUE_TITLE: "title",
  ISSUE_ID: "identifier",
  ISSUE_URL: "url",
  ISSUE_BRANCH_NAME: "branchName",
};

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeMarkdownLinkText(str: string) {
  return str.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

function getTitleLink(issue: IssueResult) {
  return {
    html: `<a href="${issue.url}">${escapeHtml(issue.title)}</a>`,
    text: `[${escapeMarkdownLinkText(issue.title)}](${issue.url})`,
  };
}

export default function CopyToClipboardSection({ issue }: { issue: IssueResult }) {
  const { issueCustomCopyAction } = getPreferenceValues<Preferences>();

  async function copyIssueAsPrompt() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Copying prompt" });

    try {
      await Clipboard.copy(getIssuePrompt(await getIssuePromptData(issue.id)));
      toast.style = Toast.Style.Success;
      toast.title = "Copied prompt to clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed copying prompt";
      toast.message = getErrorMessage(error);
    }
  }

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
      <Action.CopyToClipboard
        content={issue.url}
        title="Copy Issue URL"
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "u" },
          Windows: { modifiers: ["ctrl", "shift"], key: "u" },
        }}
      />
      <Action.CopyToClipboard
        content={issue.title}
        title="Copy Issue Title"
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "'" },
          Windows: { modifiers: ["ctrl", "shift"], key: "'" },
        }}
      />
      <Action.CopyToClipboard
        content={getTitleLink(issue)}
        title="Copy Title as Link"
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "t" },
          Windows: { modifiers: ["ctrl", "shift"], key: "t" },
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
      <Action
        icon={Icon.Clipboard}
        title="Copy as Prompt"
        onAction={copyIssueAsPrompt}
        shortcut={{
          macOS: { modifiers: ["cmd", "opt", "shift"], key: "p" },
          Windows: { modifiers: ["ctrl", "alt", "shift"], key: "p" },
        }}
      />
    </ActionPanel.Section>
  );
}
