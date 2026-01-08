import type { ReactElement } from "react";
import { List, ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";
import { DuplicateTranslationForm } from "./duplicate-translation-form";

interface KeyData {
  keyId: number;
  keyName: string;
  defaultTranslation?: string;
  mainTranslation?: string;
  platforms: string[];
  isPlural: boolean;
  description?: string;
}

interface TranslationListItemProps {
  keyData: KeyData;
  target: ReactElement;
  onSync: () => void;
}

export function TranslationListItem({ keyData, target, onSync }: TranslationListItemProps) {
  return (
    <List.Item
      key={keyData.keyId}
      id={keyData.keyId.toString()}
      title={keyData.keyName}
      subtitle={keyData.defaultTranslation || undefined}
      accessories={[
        { text: keyData.isPlural ? "Plural" : "", icon: keyData.isPlural ? Icon.Document : undefined },
        { text: keyData.platforms.join(", ") || "" },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push title="View Details" icon={Icon.Eye} target={target} />
            <Action.CopyToClipboard
              title="Copy Key Name"
              content={keyData.keyName}
              shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
            />
            {keyData.mainTranslation && (
              <Action.CopyToClipboard
                title="Copy Translation"
                content={keyData.mainTranslation}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
            <Action.Push
              title="Duplicate Key"
              icon={Icon.Duplicate}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              target={<DuplicateTranslationForm keyId={keyData.keyId} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Sync Now"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={onSync}
            />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
