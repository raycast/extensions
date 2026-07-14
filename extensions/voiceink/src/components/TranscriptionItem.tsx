import { Action, ActionPanel, Icon, List, Color } from "@raycast/api";
import type { Transcription } from "../lib/types";
import { formatRelativeTime, getDisplayText, truncateText } from "../lib/database";
import { TranscriptionDetail } from "./TranscriptionDetail";

interface Props {
  transcription: Transcription;
}

export function TranscriptionItem({ transcription }: Props) {
  const displayText = getDisplayText(transcription);
  const hasEnhancement = Boolean(transcription.enhancedText && transcription.text !== transcription.enhancedText);

  return (
    <List.Item
      title={truncateText(displayText.replace(/\n/g, " "), 60)}
      subtitle={formatRelativeTime(transcription.timestamp)}
      icon={transcription.powerModeEmoji || Icon.Message}
      accessories={buildAccessories(transcription, hasEnhancement)}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Text" content={displayText} />
            {hasEnhancement && (
              <Action.CopyToClipboard
                title="Copy Original Text"
                content={transcription.text}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
            <Action.Paste
              title="Paste Text"
              content={displayText}
              shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="View Details"
              icon={Icon.Eye}
              target={<TranscriptionDetail transcription={transcription} />}
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
