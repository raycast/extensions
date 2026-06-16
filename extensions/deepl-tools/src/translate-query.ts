import {
  Clipboard,
  LaunchProps,
  LaunchType,
  Toast,
  getPreferenceValues,
  getSelectedText,
  launchCommand,
  showToast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { translate, type Preferences } from "./deepl";

type Arguments = {
  text?: string;
};

const TOAST_PREVIEW_LIMIT = 140;

function previewText(text: string) {
  const compactText = text.replace(/\s+/g, " ").trim();
  if (compactText.length <= TOAST_PREVIEW_LIMIT) {
    return compactText;
  }

  return `${compactText.slice(0, TOAST_PREVIEW_LIMIT - 1)}…`;
}

async function getSourceText(props: LaunchProps<{ arguments: Arguments }>) {
  try {
    const selectedText = (await getSelectedText()).trim();
    if (selectedText) {
      return selectedText;
    }
  } catch {
    // No selected text is expected when the command is launched from Raycast.
  }

  const clipboardText = (await Clipboard.readText())?.trim();
  if (clipboardText) {
    return clipboardText;
  }

  return (props.arguments.text || props.fallbackText || "").trim();
}

export default async function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();
  const sourceText = await getSourceText(props);

  if (!sourceText) {
    await showToast({ style: Toast.Style.Failure, title: "No selected text or clipboard text" });
    return;
  }

  try {
    const result = await translate(sourceText, preferences);
    await Clipboard.copy(result.translatedText);
    if (result.translatedText.replace(/\s+/g, " ").trim().length > TOAST_PREVIEW_LIMIT) {
      await launchCommand({
        name: "translate-text",
        type: LaunchType.UserInitiated,
        arguments: { text: sourceText },
        context: {
          sourceText,
          translatedText: result.translatedText,
          sourceLang: result.sourceLang,
          targetLang: result.targetLang,
          rule: result.rule,
        },
      });
      return;
    }

    await showToast({
      style: Toast.Style.Success,
      title: previewText(result.translatedText),
      message: "Copied to clipboard",
    });
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't translate text" });
  }
}
