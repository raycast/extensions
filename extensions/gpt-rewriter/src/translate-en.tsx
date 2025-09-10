import { getPreferenceValues, showToast, Toast, Clipboard } from "@raycast/api";
import { processText } from "./lib/ai";
import { getTextFromSelectionOrClipboard } from "./lib/utils";

interface Preferences {
  openaiApiKey: string;
  openrouterApiKey: string;
  defaultModel: string;
  temperature: string;
  maxTokens: string;
  customSystemPrompt: string;
  translateModel: string;
}

export default async function TranslateEnCommand() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    // Get text from selection or clipboard
    const textToProcess = await getTextFromSelectionOrClipboard();

    if (!textToProcess) {
      return;
    }

    if (!preferences.openaiApiKey && !preferences.openrouterApiKey) {
      showToast(Toast.Style.Failure, "Please configure API keys in settings");
      return;
    }

    showToast(Toast.Style.Animated, "Translating to English...");

    const response = await processText({
      text: textToProcess,
      action: "translateToEnglish",
      model: preferences.defaultModel,
      temperature: parseFloat(preferences.temperature),
      maxTokens: parseInt(preferences.maxTokens),

      openaiApiKey: preferences.openaiApiKey,
      openrouterApiKey: preferences.openrouterApiKey,
      customSystemPrompt: preferences.customSystemPrompt,
      commandName: "translate",
      preferences: preferences,
    });

    if (response) {
      await Clipboard.paste(response);
      showToast(
        Toast.Style.Success,
        "Translated to English and copied to clipboard",
      );
    } else {
      showToast(Toast.Style.Failure, "Failed to translate text");
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Error translating text",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
