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
  humorModel: string;
}

export default async function HumorCommand() {
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

    showToast(Toast.Style.Animated, "Adding humor...");

    const response = await processText({
      text: textToProcess,
      action: "humorrewrite",
      model: preferences.defaultModel,
      temperature: parseFloat(preferences.temperature),
      maxTokens: parseInt(preferences.maxTokens),
      openaiApiKey: preferences.openaiApiKey,
      openrouterApiKey: preferences.openrouterApiKey,
      customSystemPrompt: preferences.customSystemPrompt,
      commandName: "humor",
      preferences: preferences,
    });

    if (response) {
      await Clipboard.paste(response);
      showToast(Toast.Style.Success, "Humor added and copied to clipboard");
    } else {
      showToast(Toast.Style.Failure, "Failed to add humor");
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Error adding humor",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
