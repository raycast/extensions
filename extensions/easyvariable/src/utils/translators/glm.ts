import { getPreferenceValues } from "@raycast/api";
import { ZhipuAI } from "zhipuai-sdk-nodejs-v4";

const preferences = getPreferenceValues<ExtensionPreferences>();

export const glmTranslate = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  if (!preferences?.enableGLMTranslate) {
    return "";
  }
  if (!preferences?.glmApiKey) {
    throw new Error("Please configure GLM API Key first");
  }

  const ai = new ZhipuAI({
    apiKey: preferences.glmApiKey,
  });
  try {
    const response = await ai.createCompletions({
      model: "glm-4-flash",
      timeout: 10000,
      messages: [
        {
          role: "system",
          content:
            "You are a translator. Translate the text to English. You can use common abbreviations and technical terms (e.g., LLM for Large Language Model, API for Application Programming Interface). Only return the translated text without explanation or punctuation.",
        },
        {
          role: "user",
          content: text,
        },
      ],
      stream: false,
      temperature: 0.7,
    });

    if ("choices" in response) {
      const translated = response.choices[0]?.message?.content?.trim() ?? "";
      return translated.replace(/[.,#!$%&*;:{}=\-_`~()"']/g, "");
    }
  } catch (error) {
    throw new Error(`Failed to fetch translation: ${(error as Error).message}`);
  }
  throw new Error("Invalid response from GLM API");
};
