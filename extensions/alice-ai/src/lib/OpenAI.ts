import OpenAI from "openai";
import { getPreference } from "../utils";

export type Model = "gpt-3.5-turbo" | "gpt-4-turbo";

export const AvailableModels: Record<Model, string> = {
  "gpt-3.5-turbo": "GPT-3.5 Turbo",
  "gpt-4-turbo": "GPT-4 Turbo",
};

export const getAvailableModels = () => {
  return Object.keys(AvailableModels);
};

export const getModelName = (model: Model) => {
  return AvailableModels[model];
};

const openai = new OpenAI({
  apiKey: getPreference("apikey"),
});

export default openai;
