import { AI, environment, getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<ExtensionPreferences>();

export const raycastTranslate = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  if (!preferences.enableRaycastTranslate) {
    return "";
  }

  if (!environment.canAccess(AI)) {
    throw new Error("This feature requires Raycast Pro subscription");
  }

  try {
    // Use Raycast AI API for translation
    const response = await AI.ask(
      `Translate the following text to English. Only return the translated text without explanation or punctuation. Use common abbreviations and technical terms where appropriate:\n\n${text}`,
    );

    // Clean up translation result
    const translated = response.trim();
    return translated.replace(/[.,#!$%&*;:{}=\-_`~()"']/g, "");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Raycast AI translation failed: ${error.message}`);
    }
    throw new Error("Raycast AI translation failed");
  }
};
