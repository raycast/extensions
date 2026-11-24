import { Action, ActionPanel, Detail } from "@raycast/api";
import type { Shortcut } from "../types/shortcut";
import { OWNER_TYPE_LABELS, SCOPE_LABELS, SOURCE_LABELS } from "../lib/labels";
import { escapeMarkdown } from "../lib/markdown";
import { isSafeHttpUrl } from "../lib/safe-url";
import { getFullShortcutText } from "../lib/shortcut-format";

type Props = {
  shortcut: Shortcut;
};

export function ShortcutDetails({ shortcut }: Props) {
  const safeSourceUrl = shortcut.sourceUrl && isSafeHttpUrl(shortcut.sourceUrl) ? shortcut.sourceUrl : undefined;

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
    safeSourceUrl ? `**Source URL:** [${escapeMarkdown(safeSourceUrl)}](${safeSourceUrl})` : undefined,
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
            <Action.CopyToClipboard title="Copy Full Shortcut" content={getFullShortcutText(shortcut)} />
          </ActionPanel.Section>
          {safeSourceUrl ? (
            <ActionPanel.Section title="Source">
              <Action.OpenInBrowser title="Open Source URL" url={safeSourceUrl} />
            </ActionPanel.Section>
          ) : null}
        </ActionPanel>
      }
    />
  );
}
