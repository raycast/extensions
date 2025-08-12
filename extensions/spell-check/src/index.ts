import { Clipboard, Toast, getPreferenceValues, getSelectedText, showToast } from "@raycast/api";
import { AIClient } from "./aiClient";

interface Preferences {
  apiKey: string;
  model?: string;
  endpoint?: string;
}

export default async function main() {
  const preferences = getPreferenceValues<Preferences>();
  const apiKey = preferences.apiKey;

  if (!apiKey) {
    await showToast(Toast.Style.Failure, "API key not set in preferences");
    return;
  }

  const selection = await getSelectedText();
  if (!selection) {
    await showToast(Toast.Style.Failure, "No text selected");
    return;
  }

  await showToast(Toast.Style.Animated, "Correcting ...");

  try {
    // Create AI client with configurable settings
    const aiClient = new AIClient({
      endpoint: preferences.endpoint ?? "https://api.mistral.ai/v1/chat/completions",
      model: preferences.model ?? "mistral-medium-latest-flash",
      apiKey: apiKey,
    });

    const resText = await aiClient.correctText(selection);
    await Clipboard.copy(resText);
    await showToast(Toast.Style.Success, "Corrected text copied!");
  } catch (error) {
    if (error instanceof Error) {
      await showToast(Toast.Style.Failure, `Error: ${error.message}`);
    }
  }
}
