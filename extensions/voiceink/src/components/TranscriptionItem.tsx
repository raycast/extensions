import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import type { Transcription } from "../lib/types";
import { copyAndConfirm, pasteToActiveApp } from "../lib/clipboard";
import { formatRelativeTime, getDisplayText, truncateText } from "../lib/database";
import { TranscriptionDetail } from "./TranscriptionDetail";

interface Props {
  transcription: Transcription;
}

export function TranscriptionItem({ transcription }: Props) {
  const { push } = useNavigation();
  const displayText = getDisplayText(transcription);
  const hasEnhancement = Boolean(transcription.enhancedText && transcription.text !== transcription.enhancedText);

  return (
    <List.Item
      title={truncateText(displayText.replace(/\n/g, " "), 60)}
      subtitle={formatRelativeTime(transcription.timestamp)}
      icon={Icon.Message}
      accessories={buildAccessories(transcription, hasEnhancement)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Copy Text" icon={Icon.Clipboard} onAction={() => copyAndConfirm(displayText)} />
            {hasEnhancement && (
              <Action
                title="Copy Original Text"
                icon={Icon.Clipboard}
                onAction={() => copyAndConfirm(transcription.text)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
            <Action
              title="Paste Text"
              icon={Icon.TextCursor}
              onAction={() => pasteToActiveApp(displayText)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="View Details"
              icon={Icon.Eye}
              onAction={() => push(<TranscriptionDetail transcription={transcription} />)}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildAccessories(transcription: Transcription, hasEnhancement: boolean): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  if (hasEnhancement) {
    accessories.push({
      tag: { value: "Enhanced", color: Color.Purple },
    });
  }

  if (transcription.modelName) {
    const shortName = transcription.modelName.split(" ")[0];
    accessories.push({
      tag: { value: shortName, color: Color.SecondaryText },
    });
  }

  return accessories;
}
