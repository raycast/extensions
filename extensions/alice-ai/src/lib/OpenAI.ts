import { getPreferenceValues } from "@raycast/api";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

export type Model =
  | "gpt-5.4"
  | "gpt-5.4-mini"
  | "gpt-5.4-nano"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gemini-3-flash-preview"
  | "gemini-3-pro-preview"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite";

export const AvailableModels: Record<Model, string> = {
  "gpt-5.4": "GPT-5.4",
  "gpt-5.4-mini": "GPT-5.4 Mini",
  "gpt-5.4-nano": "GPT-5.4 Nano",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
  "gemini-3-flash-preview": "Gemini 3 Flash Preview",
  "gemini-3-pro-preview": "Gemini 3 Pro Preview",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-flash-lite": "Gemini 2.5 Flash-Lite",
};

export const getAvailableModels = () => {
  return Object.keys(AvailableModels);
};

export const getModelName = (model: Model) => {
  return AvailableModels[model];
};

export const calculateCost = (model: Model, input: number, output: number) => {
  let cost = 0;

  switch (model) {
    case "gpt-5.4":
      cost = (input / 1_000_000) * 2.5 + (output / 1_000_000) * 15.0;
      break;
    case "gpt-5.4-mini":
      cost = (input / 1_000_000) * 0.75 + (output / 1_000_000) * 4.5;
      break;
    case "gpt-5.4-nano":
      cost = (input / 1_000_000) * 0.2 + (output / 1_000_000) * 1.25;
      break;
    case "gpt-4o":
      cost = (input / 1_000_000) * 5.0 + (output / 1_000_000) * 15.0;
      break;
    case "gpt-4o-mini":
      cost = (input / 1_000_000) * 0.15 + (output / 1_000_000) * 0.6;
      break;
    case "gemini-3-flash-preview":
      cost = (input / 1_000_000) * 0.5 + (output / 1_000_000) * 3.0;
      break;
    case "gemini-3-pro-preview":
      if (input <= 200_000) {
        cost = (input / 1_000_000) * 2.0 + (output / 1_000_000) * 12.0;
      } else {
        cost = (input / 1_000_000) * 4.0 + (output / 1_000_000) * 18.0;
      }
      break;
    case "gemini-2.5-flash":
      cost = (input / 1_000_000) * 0.3 + (output / 1_000_000) * 2.5;
      break;
    case "gemini-2.5-flash-lite":
      cost = (input / 1_000_000) * 0.1 + (output / 1_000_000) * 0.4;
      break;
  }

  return cost;
};

export const isGeminiModel = (model: Model) => model.startsWith("gemini-");

const providerPreferences = getPreferenceValues<Preferences>();
const openAIApiKey = providerPreferences.apikey?.trim();
const geminiApiKey = providerPreferences.geminiApiKey?.trim();

const openai = createOpenAI({
  apiKey: openAIApiKey,
  compatibility: "strict",
});

const google = createGoogleGenerativeAI({
  apiKey: geminiApiKey,
});

export const getModel = (model: Model) => {
  if (isGeminiModel(model)) {
    if (!geminiApiKey) {
      throw new Error("Gemini API Key is missing. Add it in extension settings.");
    }

    return google(model);
  }

  if (!openAIApiKey) {
    throw new Error("OpenAI API Key is missing. Add it in extension settings.");
  }

  return openai(model);
};
