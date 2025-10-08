import { createOpenAI } from "@ai-sdk/openai";
import { captureException, getPreferenceValues } from "@raycast/api";
import { AI_CONFIG } from "../constants";

export async function createClient() {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey || preferences.apiKey.trim().length === 0) {
    const error = new Error("OpenAI API key is required");
    captureException(error);
    throw error;
  }

  try {
    const openai = createOpenAI({ apiKey: preferences.apiKey });
    return openai(AI_CONFIG.MODEL);
  } catch (error) {
    captureException(new Error("Failed to create OpenAI client", { cause: error }));
    throw new Error("Failed to create OpenAI client. Please check your API key.");
  }
}
