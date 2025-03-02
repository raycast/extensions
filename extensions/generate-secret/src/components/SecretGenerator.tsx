import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { copySecretToClipboard } from "../utils/clipboard";
import { type SecretLength } from "../utils/crypto";

interface SecretGeneratorProps {
  length: SecretLength;
  isSelected: boolean;
  currentSecret?: string;
  onGenerate: (length: SecretLength) => void;
}

export function SecretGenerator({ length, isSelected, currentSecret, onGenerate }: SecretGeneratorProps) {
  return (
    <List.Item
      title={`${length} characters`}
      subtitle={isSelected ? currentSecret : "Click to generate"}
      icon={Icon.Key}
      accessories={[
        {
          icon: isSelected ? { source: Icon.CheckCircle, tintColor: Color.Green } : undefined,
          tooltip: isSelected ? "Current Length" : undefined,
        },
        {
          icon: { source: Icon.CopyClipboard },
          tooltip: "Copy to Clipboard",
        },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Generate Secret" icon={Icon.Wand} onAction={() => onGenerate(length)} />
            {isSelected && currentSecret && (
              <Action
                title="Copy to Clipboard"
                icon={Icon.CopyClipboard}
                onAction={() => copySecretToClipboard(currentSecret)}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
