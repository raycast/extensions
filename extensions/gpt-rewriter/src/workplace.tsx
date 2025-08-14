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
  workplacePrompt: string;
  workplaceModel: string;
}

export default async function WorkplaceCommand() {
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

    showToast(Toast.Style.Animated, "Rewriting for workplace...");

    const response = await processText({
      text: textToProcess,
      action: "rewriteInWorkplaceTone",
      model: preferences.defaultModel,
      temperature: parseFloat(preferences.temperature),
      maxTokens: parseInt(preferences.maxTokens),

      openaiApiKey: preferences.openaiApiKey,
      openrouterApiKey: preferences.openrouterApiKey,
      customSystemPrompt: preferences.customSystemPrompt,
      commandName: "workplace",
      preferences: preferences,
      customPrompt: preferences.workplacePrompt,
    });

    if (response) {
      await Clipboard.paste(response);
      showToast(
        Toast.Style.Success,
        "Text rewritten for workplace and copied to clipboard",
      );
    } else {
      showToast(Toast.Style.Failure, "Failed to rewrite text");
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Error rewriting text",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
