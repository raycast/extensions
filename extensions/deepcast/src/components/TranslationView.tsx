import { Action, ActionPanel, Detail } from "@raycast/api";
import { SourceLanguage, source_languages } from "../utils";

export const TranslationView = (props: { translation: string | null; sourceLanguage: string }) => {
  const translation = props.translation;
  const sourceLanguage = source_languages[props.sourceLanguage as SourceLanguage] ?? "unknown language";
  const sourceLanguageMessage = `Translated from ${sourceLanguage}`;

  if (!translation) return null;

  return (
    <Detail
      navigationTitle={sourceLanguageMessage}
      markdown={translation}
      actions={
        <ActionPanel title="What to do with Translation">
          <Action.CopyToClipboard title="Copy to Clipboard" content={translation} />
          <Action.Paste title="Paste to Active App" content={translation} />
        </ActionPanel>
      }
    />
  );
};

export default TranslationView;
