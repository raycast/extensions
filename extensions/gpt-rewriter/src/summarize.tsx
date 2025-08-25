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
  summarizePrompt: string;
  summarizeModel: string;
}

export default async function SummarizeCommand() {
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

    showToast(Toast.Style.Animated, "Summarizing text...");

    const response = await processText({
      text: textToProcess,
      action: "summarizeText",
      model: preferences.defaultModel,
      temperature: parseFloat(preferences.temperature),
      maxTokens: parseInt(preferences.maxTokens),

      openaiApiKey: preferences.openaiApiKey,
      openrouterApiKey: preferences.openrouterApiKey,
      customSystemPrompt: preferences.customSystemPrompt,
      commandName: "summarize",
      preferences: preferences,
      customPrompt: preferences.summarizePrompt,
    });

    if (response) {
      await Clipboard.paste(response);
      showToast(Toast.Style.Success, "Text summarized and copied to clipboard");
    } else {
      showToast(Toast.Style.Failure, "Failed to summarize text");
    }
  } catch (error) {
    showToast(
      Toast.Style.Failure,
      "Error summarizing text",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
