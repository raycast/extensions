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
  titleModel: string;
}

export default async function TitleCommand() {
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

    showToast(Toast.Style.Animated, "Generating title...");

    const response = await processText({
      text: selectedText,
      action: "generateTitle",
      model: preferences.defaultModel,
      temperature: parseFloat(preferences.temperature),
      maxTokens: parseInt(preferences.maxTokens),
      openaiApiKey: preferences.openaiApiKey,
      openrouterApiKey: preferences.openrouterApiKey,
      customSystemPrompt: preferences.customSystemPrompt,
      commandName: "title",
      preferences: preferences,
    });

    if (response) {
      await Clipboard.paste(response);
      showToast(Toast.Style.Success, "Title generated and copied to clipboard");
    } else {
      showToast(Toast.Style.Failure, "Failed to generate title");
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Error generating title",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
