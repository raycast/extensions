/**
 * Shared action panel for ASCII art items
 */
import { Action, ActionPanel, Icon } from "@raycast/api";
import type { PropsWithChildren } from "react";
import { SHORTCUTS, t } from "../../constants";

interface GenerateActionsProps {
  art: string;
  fontName: string;
  onCopy: (art: string) => Promise<void>;
  onPaste: (art: string) => Promise<void>;
  onSave: (art: string, fontName: string) => Promise<void>;
}

export function GenerateActions({
  art,
  fontName,
  onCopy,
  onPaste,
  onSave,
  children,
}: PropsWithChildren<GenerateActionsProps>) {
  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={t("actions.copyToClipboard")}
          icon={Icon.Clipboard}
          onAction={() => onCopy(art)}
          shortcut={SHORTCUTS.copy}
        />
        <Action
          title={t("actions.pasteToActiveApp")}
          icon={Icon.Document}
          onAction={() => onPaste(art)}
          shortcut={SHORTCUTS.paste}
        />
        <Action
          title={t("actions.saveToCollection")}
          icon={Icon.Star}
          onAction={() => onSave(art, fontName)}
          shortcut={SHORTCUTS.save}
        />
      </ActionPanel.Section>
      <>{children}</>
    </ActionPanel>
  );
}
