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

interface OpenAIConfig {
  baseURL: string;
  apiKey: string;
  model: string;
}

async function callOpenAI(prompt: string, config: OpenAIConfig): Promise<string> {
  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "system",
        content:
          "You are a helpful assistant that adds appropriate emojis to text based on context. Add emojis that enhance the meaning, but don't overdo it. Place emojis in natural positions within the text. ONLY return the emojified text.",
      },
      {
        role: "user",
        content: `Add appropriate emojis to enhance this text: ${prompt}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  const content = response.choices[0].message.content?.trim();
  if (!content) {
    throw new Error("No content received from API");
  }

  return content;
}

export async function emojifyText(text: string): Promise<EmojifyResponse> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error("OpenAI API key is not set. Please set it in the extension preferences.");
  }

  try {
    const config: OpenAIConfig = {
      baseURL: preferences.baseURL || "https://api.openai.com",
      apiKey: preferences.apiKey,
      model: preferences.model || "gpt-3.5-turbo",
    };

    const emojifiedText = await callOpenAI(text, config);

    return {
      text: emojifiedText,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error emojifying text:", error);
    throw error;
  }
}
