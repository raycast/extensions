import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { PasteAction } from "../../components/paste-action";
import { ChangelogVersion, formatChangelogVersionChanges } from "../../utils/changelog";

interface ChangelogDetailProps {
  version: ChangelogVersion;
}

export default function ChangelogDetail({ version }: ChangelogDetailProps) {
  const markdown = `
# Version ${version.version}

## Changes

${formatChangelogVersionChanges(version)}
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Version ${version.version}`}
      actions={
        <ActionPanel>
          <PasteAction content={formatChangelogVersionChanges(version)} />
          <Action.CopyToClipboard title="Copy to Clipboard" content={version.changes.join("\n")} icon={Icon.Document} />
          <Action.OpenInBrowser
            title="View on GitHub"
            url="https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md"
            icon={Icon.Globe}
          />
        </ActionPanel>
      }
    />
  );
}
