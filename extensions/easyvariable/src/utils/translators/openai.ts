import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getPreferenceValues } from "@raycast/api";
import { HttpsProxyAgent } from "https-proxy-agent";

const preferences = getPreferenceValues<ExtensionPreferences>();

export const openaiTranslate = async (text: string): Promise<string> => {
  if (!text.trim()) return "";

  if (!preferences?.enableOpenAITranslate) {
    return "";
  }
  if (!preferences?.openaiApiKey) {
    throw new Error("Please configure OpenAI API Key first");
  }

  const model = new ChatOpenAI({
    openAIApiKey: preferences.openaiApiKey,
    modelName: preferences.openaiModel || "gpt-3.5-turbo",
    temperature: 0.7,
    timeout: 10000,
    maxRetries: 1,
    configuration: {
      baseURL: preferences.openaiBaseUrl,
      httpAgent: preferences?.httpProxy ? new HttpsProxyAgent(preferences.httpProxy) : undefined,
    },
  });
  try {
    const response = await model.invoke([
      new SystemMessage(
        "You are a translator. Translate the text to English. You can use common abbreviations and technical terms (e.g., LLM for Large Language Model, API for Application Programming Interface). Only return the translated text without explanation or punctuation.",
      ),
      new HumanMessage(text),
    ]);

    const translated = response.content as string;
    translated.trim();
    return translated.replace(/[.,#!$%&*;:{}=\-_`~()"']/g, "");
  } catch (error) {
    throw new Error(`OpenAI API translation failed: ${(error as Error).message}`);
  }
};
