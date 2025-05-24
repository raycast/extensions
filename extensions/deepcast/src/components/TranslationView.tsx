import {
  Action,
  ActionPanel,
  Detail,
  getPreferenceValues,
  closeMainWindow,
  Clipboard,
  showToast,
  Toast,
} from "@raycast/api";
import { SourceLanguage, source_languages } from "../utils";

export const TranslationView = (props: { translation: string | null; sourceLanguage?: string }) => {
  const translation = props.translation;
  const sourceLanguage = source_languages[props.sourceLanguage as SourceLanguage] ?? "unknown language";
  const sourceLanguageMessage = `Translated from ${sourceLanguage}`;
  const { closeRaycastAfterTranslation } = getPreferenceValues<Preferences>();

  if (!translation) return null;

  const handleCopyToClipboard = async () => {
    await Clipboard.copy(translation);
    await showToast(Toast.Style.Success, "Translation copied to clipboard!");
    if (closeRaycastAfterTranslation) {
      // Add a short delay so users can see the success message
      setTimeout(async () => {
        await closeMainWindow();
      }, 1000);
    }
  };

  const handlePasteInFrontmostApp = async () => {
    await Clipboard.paste(translation);
    await showToast(Toast.Style.Success, "Translation pasted!");
    if (closeRaycastAfterTranslation) {
      // Add a short delay so users can see the success message
      setTimeout(async () => {
        await closeMainWindow();
      }, 1000);
    }
  };

  return (
    <Detail
      navigationTitle={sourceLanguageMessage}
      markdown={translation}
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
