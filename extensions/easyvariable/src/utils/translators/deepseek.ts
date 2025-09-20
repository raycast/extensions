import { ChatDeepSeek } from "@langchain/deepseek";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getPreferenceValues } from "@raycast/api";

const preferences = getPreferenceValues<ExtensionPreferences>();

export const deepseekTranslate = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  if (!preferences?.enableDeepseekTranslate) {
    return "";
  }
  if (!preferences?.deepseekApiKey) {
    throw new Error("Please configure Deepseek API Key first");
  }

  const model = new ChatDeepSeek({
    apiKey: preferences.deepseekApiKey,
    temperature: 0.7,
    model: "deepseek-chat",
  });
  try {
    const response = await model.invoke([
      new SystemMessage(
        "You are a translator. Translate the text to English. You can use common abbreviations and technical terms (e.g., LLM for Large Language Model, API for Application Programming Interface). Only return the translated text without explanation or punctuation.",
      ),
      new HumanMessage(text),
    ]);

    const translated = response.content as string;
    return translated.trim().replace(/[.,#!$%&*;:{}=\-_`~()"']/g, "");
  } catch (error) {
    throw new Error(`Failed to fetch translation: ${(error as Error).message}`);
  }
};
