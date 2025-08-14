import {
  getPreferenceValues,
  showToast,
  Toast,
  getSelectedText,
  Clipboard,
} from "@raycast/api";
import { processText } from "./lib/ai";

interface Preferences {
  openaiApiKey: string;
  openrouterApiKey: string;
  defaultModel: string;
  temperature: string;
  maxTokens: string;
  customSystemPrompt: string;
  translateModel: string;
}

export default async function TranslateTrCommand() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    const selectedText = await getSelectedText();

    if (!selectedText.trim()) {
      showToast(Toast.Style.Failure, "No text selected");
      return;
    }

    if (!preferences.openaiApiKey && !preferences.openrouterApiKey) {
      showToast(Toast.Style.Failure, "Please configure API keys in settings");
      return;
    }

    showToast(Toast.Style.Animated, "Translating to Turkish...");

    const response = await processText({
      text: selectedText,
      action: "translateToTurkish",
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
        "Translated to Turkish and copied to clipboard",
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
