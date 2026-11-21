import { Clipboard, getPreferenceValues, getSelectedText } from "@raycast/api";
import { LMStudioClient } from "./lmstudio";

export function getExtensionPreferences() {
  return getPreferenceValues<Preferences>();
}

export function createClient() {
  const preferences = getExtensionPreferences();
  return new LMStudioClient({
    baseUrl: preferences.baseUrl,
    apiToken: preferences.apiToken,
  });
}

export function friendlyError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The request was canceled.";
  }
  if (error instanceof TypeError && /fetch|connect/i.test(error.message)) {
    return "Could not connect to LM Studio. Start its local server and verify the extension preferences.";
  }
  return error instanceof Error ? error.message : "LM Studio could not complete the request.";
}

export async function selectedTextOrClipboard() {
  try {
    const selected = await getSelectedText();
    if (selected.trim()) return selected;
  } catch {
    // Falling back to the clipboard is intentional when no text is selected.
  }

  return (await Clipboard.readText()) ?? "";
}
