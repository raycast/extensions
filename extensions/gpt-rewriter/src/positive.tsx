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
  positiveModel: string;
}

export default async function PositiveCommand() {
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

    showToast(Toast.Style.Animated, "Generating positive reply...");

    const response = await processText({
      text: selectedText,
      action: "response_positive",
      model: preferences.defaultModel,
      temperature: parseFloat(preferences.temperature),
      maxTokens: parseInt(preferences.maxTokens),
      openaiApiKey: preferences.openaiApiKey,
      openrouterApiKey: preferences.openrouterApiKey,
      customSystemPrompt: preferences.customSystemPrompt,
      commandName: "positive",
      preferences: preferences,
    });

    if (response) {
      await Clipboard.paste(response);
      showToast(
        Toast.Style.Success,
        "Positive reply generated and copied to clipboard",
      );
    } else {
      showToast(Toast.Style.Failure, "Failed to generate positive reply");
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Error generating positive reply",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
