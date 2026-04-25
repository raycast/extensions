import React from "react";
import { Detail, ActionPanel, Action, useNavigation } from "@raycast/api";

interface JiraIssueResultProps {
  issueKey: string;
  issueUrl?: string;
  message?: string;
}

export function JiraIssueResult({ issueKey, issueUrl, message = "" }: JiraIssueResultProps) {
  const { pop } = useNavigation();

  const markdown = `# ✅ Issue Created

**Issue Key:** \`${issueKey}\`

${message ? `\n${message}\n` : ""}

${issueUrl ? `**URL:** \`${issueUrl}\`` : ""}`;

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Issue Key" content={issueKey} />
          {issueUrl && <Action.CopyToClipboard title="Copy Issue URL" content={issueUrl} />}
          <Action title="Close" onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
