import OpenAI from "openai";
import { getPreference } from "../utils";

export const MODEL: Record<string, string> = {
  "gpt-3.5-turbo": "GPT-3.5 Turbo",
  "gpt-4-turbo-preview": "GPT-4 Turbo",
};

export const getAvailableModels = () => {
  return Object.keys(MODEL);
};

export const getModelName = (model: string) => {
  return MODEL[model];
};

const openai = new OpenAI({
  apiKey: getPreference("apikey"),
});

export default openai;
