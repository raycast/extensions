import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import type { TargetLanguage } from "../lib/languages";
import type { ClaudeModel } from "../lib/preferences";
import { escapeMarkdownHtml } from "../utils/markdown";

interface TranslationDetailProps {
  translation: string;
  targetLanguage: TargetLanguage;
  model: ClaudeModel;
  characterCount: number;
  onTranslateAgain: () => void;
}

export function TranslationDetail({
  translation,
  targetLanguage,
  model,
  characterCount,
  onTranslateAgain,
}: TranslationDetailProps) {
  return (
    <Detail
      navigationTitle="Translation"
      markdown={escapeMarkdownHtml(translation)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Target Language" text={targetLanguage} />
          <Detail.Metadata.Label title="Model" text={model} />
          <Detail.Metadata.Label title="Characters" text={String(characterCount)} />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Translation" content={translation} />
          <Action.Paste title="Paste to Active App" content={translation} />
          <Action
            title="Translate Again"
            icon={Icon.ArrowCounterClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onTranslateAgain}
          />
        </ActionPanel>
      }
    />
  );
}
