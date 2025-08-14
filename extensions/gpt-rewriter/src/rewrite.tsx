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
  rewritePrompt: string;
  rewriteModel: string;
}

export default async function RewriteCommand() {
  const preferences = getPreferenceValues<Preferences>();

  try {
    // Get selected text
    const selectedText = await getSelectedText();

    if (!selectedText.trim()) {
      showToast(Toast.Style.Failure, "No text selected");
      return;
    }

    if (!preferences.openaiApiKey && !preferences.openrouterApiKey) {
      showToast(Toast.Style.Failure, "Please configure API keys in settings");
      return;
    }

    showToast(Toast.Style.Animated, "Rewriting text...");

    const response = await processText({
      text: selectedText,
      action: "normalRewrite",
      model: preferences.defaultModel,
      temperature: parseFloat(preferences.temperature),
      maxTokens: parseInt(preferences.maxTokens),

      openaiApiKey: preferences.openaiApiKey,
      openrouterApiKey: preferences.openrouterApiKey,
      customSystemPrompt: preferences.customSystemPrompt,
      commandName: "rewrite",
      preferences: preferences,
    });

    if (response) {
      // Copy result to clipboard for easy pasting
      await Clipboard.paste(response);
      showToast(Toast.Style.Success, "Text rewritten and copied to clipboard");
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
