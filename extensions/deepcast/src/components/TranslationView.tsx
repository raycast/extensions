import { Action, ActionPanel, Detail, getPreferenceValues, Icon, showToast, Toast } from "@raycast/api";
import { htmlToDisplayText } from "../hyperlinks";
import {
  SourceLanguage,
  copyTranslatedText,
  delayedCloseWindow,
  pasteTranslatedText,
  source_languages,
} from "../utils";

export const TranslationView = (props: { translation: string | null; sourceLanguage?: string; isHtml?: boolean }) => {
  const translation = props.translation;
  const displayTranslation = translation && props.isHtml ? htmlToDisplayText(translation) : translation;
  const displayedTranslation = displayTranslation ? displayTranslation.replace(/\n/g, "\n\n") : null;
  const sourceLanguage = source_languages[props.sourceLanguage as SourceLanguage] ?? "unknown language";
  const sourceLanguageMessage = `Translated from ${sourceLanguage}`;
  const { closeRaycastAfterTranslation } = getPreferenceValues<Preferences>();

  if (!translation) return null;

  const handleCopyToClipboard = async () => {
    try {
      await copyTranslatedText(translation, Boolean(props.isHtml));
      await showToast(Toast.Style.Success, "Translation copied to clipboard!");
      await delayedCloseWindow(closeRaycastAfterTranslation);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      await showToast(Toast.Style.Failure, "Failed to copy to clipboard");
    }
  };

  const handlePasteInFrontmostApp = async () => {
    try {
      await pasteTranslatedText(translation, Boolean(props.isHtml));
      await showToast(Toast.Style.Success, "Translation pasted!");
      await delayedCloseWindow(closeRaycastAfterTranslation);
    } catch (error) {
      console.error("Failed to paste:", error);
      await showToast(Toast.Style.Failure, "Failed to paste in frontmost app");
    }
  };

  return (
    <Detail
      navigationTitle={sourceLanguageMessage}
      markdown={displayedTranslation}
      actions={
        <ActionPanel>
          <Action icon={Icon.CopyClipboard} title="Copy Rich Text" onAction={handleCopyToClipboard} />
          <Action icon={Icon.Document} title="Paste Translation" onAction={handlePasteInFrontmostApp} />
        </ActionPanel>
      }
    />
  );
};

export default TranslationView;
