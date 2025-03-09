import { getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import OpenAI from "openai";

interface Preferences {
  apiKey: string;
  baseURL?: string;
  model?: string;
  customPrompt?: string;
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

interface PromptConfig {
  systemMessage: string;
  userMessageTemplate: string;
}

const defaultPromptConfig: PromptConfig = {
  systemMessage: [
    "You are a helpful assistant that adds appropriate emojis to text based on context.",
    "Add emojis that enhance the meaning, but don't overdo it.",
    "Place emojis in natural positions within the text.",
    "Here are some examples of contexts:",
    "For formatted lists:",
    "- Fix bugs",
    "- Improve performance",
    "- Add new features",
    "=>",
    "- 🐞 Fix bugs",
    "- ⚡ Improve performance",
    "- ✨ Add new features",
    "For Greetings:",
    "Good morning everyone -> 🌅 Good morning everyone!",
    "Have a great weekend -> 🎉 Have a great weekend!",
  ].join("\n"),
  userMessageTemplate: `Add appropriate emojis to enhance this text: {text}. ONLY return the emojified text.`,
};

async function callOpenAI(
  text: string,
  config: OpenAIConfig,
  promptConfig: PromptConfig = defaultPromptConfig,
): Promise<string> {
  const client = new OpenAI({
    baseURL: config.baseURL,
    apiKey: config.apiKey,
  });

  const userMessage = promptConfig.userMessageTemplate.replace("{text}", text);

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "system",
        content: promptConfig.systemMessage,
      },
      {
        role: "user",
        content: userMessage,
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

const emojiSelectorPromptConfig: PromptConfig = {
  systemMessage: [
    "You are a helpful assistant that selects the single most appropriate emoji for a given text.",
    "Your task is to analyze the text and return ONLY ONE emoji that best represents its meaning or emotion.",
    "Do not return any text, explanations, or multiple emojis - just the single most relevant emoji.",
    "Examples:",
    "'I'm so happy today!' -> 😄",
    "'The project deadline is approaching' -> ⏰",
    "'Just finished a marathon' -> 🏃",
    "'Looking at the stars tonight' -> ✨",
  ].join("\n"),
  userMessageTemplate: `Select the single most appropriate emoji for this text: {text}. Return ONLY the emoji, nothing else.`,
};

export async function emojifyText(text: string): Promise<EmojifyResponse> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error("OpenAI API key is not set. Please set it in the extension preferences.");
  }

  try {
    const config: OpenAIConfig = {
      baseURL: preferences.baseURL || "https://api.openai.com",
      apiKey: preferences.apiKey,
      model: preferences.model || "gpt-4o-mini",
    };

    // Create a custom prompt config if user has provided a custom prompt template
    let promptConfig = defaultPromptConfig;
    if (preferences.customPrompt) {
      promptConfig = {
        ...defaultPromptConfig,
        userMessageTemplate: preferences.customPrompt,
      };
    }

    const emojifiedText = await callOpenAI(text, config, promptConfig);

    return {
      text: emojifiedText,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error emojifying text:", error);
    throw error;
  }
}

export async function getEmojiForText(text: string): Promise<EmojifyResponse> {
  const preferences = getPreferenceValues<Preferences>();

  if (!preferences.apiKey) {
    throw new Error("OpenAI API key is not set. Please set it in the extension preferences.");
  }

  try {
    const config: OpenAIConfig = {
      baseURL: preferences.baseURL || "https://api.openai.com",
      apiKey: preferences.apiKey,
      model: preferences.model || "gpt-4o-mini",
    };

    const emoji = await callOpenAI(text, config, emojiSelectorPromptConfig);

    return {
      text: emoji,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error("Error finding emoji:", error);
    showFailureToast(error);
    throw error;
  }
}
