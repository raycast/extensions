import { getPreferenceValues } from "@raycast/api";
import OpenAI from "openai";

interface Preferences {
  apiKey: string;
  baseURL?: string;
  model?: string;
}

interface EmojifyResponse {
  text: string;
  timestamp: number;
}

export async function emojifyText(text: string): Promise<EmojifyResponse> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error("OpenAI API key is not set. Please set it in the extension preferences.");
  }

  try {
    const baseURL = preferences.baseURL || "https://api.openai.com";
    const model = preferences.model || "gpt-3.5-turbo";

    // Initialize the OpenAI client
    const client = new OpenAI({
      baseURL: baseURL,
      apiKey: preferences.apiKey,
    });

    // Create the chat completion request
    const response = await client.chat.completions.create({
      model: model,
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that adds appropriate emojis to text based on context. Add emojis that enhance the meaning, but don't overdo it. Place emojis in natural positions within the text. ONLY return the emojified text.",
        },
        {
          role: "user",
          content: `Add appropriate emojis to enhance this text: ${text}`,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Extract the emojified text from the response
    const emojifiedText = response.choices[0].message.content?.trim() || "";

    if (!emojifiedText) {
      throw new Error("No content received from API");
    }

    return {
      text: emojifiedText,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error emojifying text:", error);
    throw error;
  }
}
