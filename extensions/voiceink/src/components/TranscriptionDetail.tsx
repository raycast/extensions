import { Action, ActionPanel, Detail } from "@raycast/api";
import type { Transcription } from "../lib/types";
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
          <Action.CopyToClipboard title="Copy Text" content={displayText} />
          {transcription.enhancedText && transcription.text !== transcription.enhancedText && (
            <Action.CopyToClipboard
              title="Copy Original Text"
              content={transcription.text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
          <Action.Paste title="Paste Text" content={displayText} shortcut={{ modifiers: ["cmd", "shift"], key: "v" }} />
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
