import { Action, ActionPanel, Detail } from "@raycast/api";
import type { Shortcut } from "../types/shortcut";
import { OWNER_TYPE_LABELS, SCOPE_LABELS, SOURCE_LABELS } from "../lib/labels";
import { escapeMarkdown } from "../lib/markdown";
import { getFullShortcutText } from "../lib/shortcut-format";

type Props = {
  shortcut: Shortcut;
};

export function ShortcutDetails({ shortcut }: Props) {
  const markdown = [
    `# ${escapeMarkdown(shortcut.commandName)}`,
    "",
    `## ${shortcut.shortcutDisplay}`,
    "",
    `**Owner:** ${escapeMarkdown(shortcut.ownerName)}`,
    "",
    `**Owner Kind:** ${OWNER_TYPE_LABELS[shortcut.ownerType]}`,
    "",
    `**Scope:** ${SCOPE_LABELS[shortcut.scope]}`,
    "",
    `**Source:** ${SOURCE_LABELS[shortcut.sourceType]}`,
    "",
    shortcut.notes ? `**Notes:** ${escapeMarkdown(shortcut.notes)}` : undefined,
    shortcut.sourceUrl ? `**Source URL:** ${shortcut.sourceUrl}` : undefined,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Shortcut" content={shortcut.shortcutDisplay} />
            <Action.CopyToClipboard title="Copy Command Name" content={shortcut.commandName} />
            <Action.CopyToClipboard
              title="Copy Full Shortcut"
              content={getFullShortcutText(shortcut)}
            />
          </ActionPanel.Section>
          {shortcut.sourceUrl ? (
            <ActionPanel.Section title="Source">
              <Action.OpenInBrowser title="Open Source URL" url={shortcut.sourceUrl} />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
