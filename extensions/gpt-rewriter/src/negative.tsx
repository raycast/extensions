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
  negativeModel: string;
}

export default async function NegativeCommand() {
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

    showToast(Toast.Style.Animated, "Generating negative reply...");

    const response = await processText({
      text: selectedText,
      action: "response_negative",
      model: preferences.defaultModel,
      temperature: parseFloat(preferences.temperature),
      maxTokens: parseInt(preferences.maxTokens),
      openaiApiKey: preferences.openaiApiKey,
      openrouterApiKey: preferences.openrouterApiKey,
      customSystemPrompt: preferences.customSystemPrompt,
      commandName: "negative",
      preferences: preferences,
    });

    if (response) {
      await Clipboard.paste(response);
      showToast(
        Toast.Style.Success,
        "Negative reply generated and copied to clipboard",
      );
    } else {
      showToast(Toast.Style.Failure, "Failed to generate negative reply");
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Error generating negative reply",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
