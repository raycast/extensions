import { Action, ActionPanel, Detail, getPreferenceValues, Clipboard, showToast, Toast } from "@raycast/api";
import { SourceLanguage, source_languages, delayedCloseWindow } from "../utils";

export const TranslationView = (props: { translation: string | null; sourceLanguage?: string }) => {
  const translation = props.translation;
  const displayedTranslation = translation ? translation.replace(/\n/g, "\n\n") : null;
  const sourceLanguage = source_languages[props.sourceLanguage as SourceLanguage] ?? "unknown language";
  const sourceLanguageMessage = `Translated from ${sourceLanguage}`;
  const { closeRaycastAfterTranslation } = getPreferenceValues<Preferences>();

  if (!translation) return null;

  const handleCopyToClipboard = async () => {
    try {
      await Clipboard.copy(translation);
      await showToast(Toast.Style.Success, "Translation copied to clipboard!");
      await delayedCloseWindow(closeRaycastAfterTranslation);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      await showToast(Toast.Style.Failure, "Failed to copy to clipboard");
    }
  };

  const handlePasteInFrontmostApp = async () => {
    try {
      await Clipboard.paste(translation);
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
          <Action title="Copy to Clipboard" onAction={handleCopyToClipboard} />
          <Action title="Paste in Frontmost App" onAction={handlePasteInFrontmostApp} />
        </ActionPanel>
      }
    />
  );
};

export default TranslationView;
