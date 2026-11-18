import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import type { Transcription } from "../lib/types";
import { copyAndConfirm, pasteToActiveApp } from "../lib/clipboard";
import { cfTimeToDate, formatDuration, getDisplayText } from "../lib/database";

interface Props {
  transcription: Transcription;
}

export function TranscriptionDetail({ transcription }: Props) {
  const date = cfTimeToDate(transcription.timestamp);
  const displayText = getDisplayText(transcription);

  const markdown = buildMarkdown(transcription);

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Transcription"
      metadata={
        <Detail.Metadata>
          {transcription.powerModeEmoji && (
            <Detail.Metadata.Label
              title="Power Mode"
              text={`${transcription.powerModeEmoji} ${transcription.powerModeName || ""}`}
            />
          )}
          {transcription.modelName && <Detail.Metadata.Label title="Model" text={transcription.modelName} />}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Duration" text={formatDuration(transcription.duration)} />
          <Detail.Metadata.Label title="Time" text={date.toLocaleString()} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action title="Copy Text" icon={Icon.Clipboard} onAction={() => copyAndConfirm(displayText)} />
          {transcription.enhancedText && transcription.text !== transcription.enhancedText && (
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
        </ActionPanel>
      }
    />
  );
}

function buildMarkdown(transcription: Transcription): string {
  const parts: string[] = [];

  if (transcription.enhancedText) {
    parts.push(transcription.enhancedText);

    if (transcription.text !== transcription.enhancedText) {
      parts.push("");
      parts.push("---");
      parts.push("");
      parts.push("**Original:**");
      parts.push("");
      parts.push(transcription.text);
    }
  } else {
    parts.push(transcription.text);
  }

  return parts.join("\n");
}
