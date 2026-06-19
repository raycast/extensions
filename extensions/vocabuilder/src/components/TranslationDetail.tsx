import { Icon, List } from "@raycast/api";
import { buildTextTranslationDetailMarkdown, buildTranslationDetailMarkdown } from "../lib/markdown";
import { Translation } from "../lib/types";

export const TTS_HINT_TEXT = "⌘O to pronounce · ⌘⇧O for translation";

type TranslationDetailInput = Pick<
  Translation,
  "type" | "word" | "translation" | "partOfSpeech" | "example" | "exampleTranslation"
>;

export function buildDetailMarkdown(item: TranslationDetailInput, originalInput?: string): string {
  return item.type === "text"
    ? buildTextTranslationDetailMarkdown(item.word, item.translation)
    : buildTranslationDetailMarkdown(item, originalInput);
}

interface TranslationDetailProps {
  item: Translation;
  originalInput?: string;
}

export function TranslationDetail({ item, originalInput }: TranslationDetailProps) {
  const markdown = buildDetailMarkdown(item, originalInput);

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="" text={TTS_HINT_TEXT} icon={Icon.SpeakerHigh} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}
