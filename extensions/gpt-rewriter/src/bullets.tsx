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
  bulletsPrompt: string;
  bulletsModel: string;
}

export default async function BulletsCommand() {
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

    showToast(Toast.Style.Animated, "Converting to bullet points...");

    const response = await processText({
      text: textToProcess,
      action: "convertToBulletPoints",
      model: preferences.defaultModel,
      temperature: parseFloat(preferences.temperature),
      maxTokens: parseInt(preferences.maxTokens),

      openaiApiKey: preferences.openaiApiKey,
      openrouterApiKey: preferences.openrouterApiKey,
      customSystemPrompt: preferences.customSystemPrompt,
      commandName: "bullets",
      preferences: preferences,
      customPrompt: preferences.bulletsPrompt,
    });

    if (response) {
      await Clipboard.paste(response);
      showToast(
        Toast.Style.Success,
        "Converted to bullet points and copied to clipboard",
      );
    } else {
      showToast(Toast.Style.Failure, "Failed to convert text");
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Error converting text",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
