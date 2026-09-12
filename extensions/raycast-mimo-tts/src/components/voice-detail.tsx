import { Color, List } from "@raycast/api";
import type { VoiceConfig } from "../api/mimo-types";
import { escapeMarkdown } from "../utils/mimo-markdown";

export function VoiceDetail({
  voice,
  model,
  footer,
  speedLabel,
  selectedText,
}: {
  voice: VoiceConfig;
  model: string;
  footer: string;
  speedLabel?: string;
  selectedText?: string;
}) {
  return (
    <List.Item.Detail
      markdown={`## ${escapeMarkdown(voice.name)}\n\n${escapeMarkdown(voice.description)}\n\n${footer}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Voice ID" text={voice.id} />
          <List.Item.Detail.Metadata.Label title="Model" text={model} />
          <List.Item.Detail.Metadata.Label title="Language" text={voice.language} />
          {speedLabel ? <List.Item.Detail.Metadata.Label title="Speed" text={speedLabel} /> : null}
          {selectedText !== undefined ? (
            <List.Item.Detail.Metadata.Label
              title="Selected Text"
              text={selectedText ? `${selectedText.length} characters` : "None"}
            />
          ) : null}
          <List.Item.Detail.Metadata.TagList title="Traits">
            <List.Item.Detail.Metadata.TagList.Item text={voice.gender} color={Color.Blue} />
            <List.Item.Detail.Metadata.TagList.Item text={voice.category} color={Color.SecondaryText} />
            {voice.recommended ? (
              <List.Item.Detail.Metadata.TagList.Item text="Recommended" color={Color.Green} />
            ) : null}
          </List.Item.Detail.Metadata.TagList>
        </List.Item.Detail.Metadata>
      }
    />
  );
}
