import { List } from "@raycast/api";
import { buildTextTranslationDetailMarkdown, buildTranslationDetailMarkdown } from "../lib/markdown";
import { LanguagePair } from "../lib/languages";
import { Translation } from "../lib/types";
import { DetailMetadata } from "./DetailMetadata";

type TranslationDetailInput = Pick<
  Translation,
  | "type"
  | "word"
  | "translation"
  | "partOfSpeech"
  | "example"
  | "exampleTranslation"
  | "transcription"
  | "forms"
  | "register"
>;

export function buildDetailMarkdown(item: TranslationDetailInput, originalInput?: string): string {
  return item.type === "text"
    ? buildTextTranslationDetailMarkdown(item.word, item.translation)
    : buildTranslationDetailMarkdown(item, originalInput);
}

interface TranslationDetailProps {
  item: Translation;
  languagePair: LanguagePair;
  originalInput?: string;
}

export function TranslationDetail({ item, languagePair, originalInput }: TranslationDetailProps) {
  return (
    <List.Item.Detail
      markdown={buildDetailMarkdown(item, originalInput)}
      metadata={
        <DetailMetadata
          languagePair={languagePair}
          sourceTitle={item.type === "text" ? "Pronounce Original" : "Pronounce Word"}
        />
      }
    />
  );
}
