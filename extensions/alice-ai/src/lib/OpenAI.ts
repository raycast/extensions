import { getPreferenceValues } from "@raycast/api";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

export type Model =
  | "gpt-6-luna"
  | "gpt-6.1-sol"
  | "gpt-6-astra"
  | "gpt-5.6-sol"
  | "gpt-5.6-terra"
  | "gpt-5.6-luna"
  | "gpt-5.4"
  | "gpt-5.4-mini"
  | "gpt-5.4-nano"
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gemini-3.8-flash"
  | "gemini-3.6-flash"
  | "gemini-3.5-flash-lite"
  | "gemini-3.1-flash-lite"
  | "gemini-3.1-pro-preview"
  | "gemini-3-flash-preview"
  | "gemini-2.5-flash"
  | "gemini-2.5-flash-lite";

export const AvailableModels: Record<Model, string> = {
  "gpt-6-luna": "GPT-6 Luna",
  "gpt-6.1-sol": "GPT-6.1 Sol",
  "gpt-6-astra": "GPT-6 Astra",
  "gpt-5.6-sol": "GPT-5.6 Sol",
  "gpt-5.6-terra": "GPT-5.6 Terra",
  "gpt-5.6-luna": "GPT-5.6 Luna",
  "gpt-5.4": "GPT-5.4",
  "gpt-5.4-mini": "GPT-5.4 Mini",
  "gpt-5.4-nano": "GPT-5.4 Nano",
  "gpt-4o": "GPT-4o",
  "gpt-4o-mini": "GPT-4o Mini",
  "gemini-3.8-flash": "Gemini 3.8 Flash",
  "gemini-3.6-flash": "Gemini 3.6 Flash",
  "gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite",
  "gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite",
  "gemini-3.1-pro-preview": "Gemini 3.1 Pro Preview",
  "gemini-3-flash-preview": "Gemini 3 Flash Preview",
  "gemini-2.5-flash": "Gemini 2.5 Flash",
  "gemini-2.5-flash-lite": "Gemini 2.5 Flash-Lite",
};

export const DefaultModel: Model = "gpt-6-luna";

export const getCurrentModel = (model: Model): Model => {
  return (model as string) === "gemini-3-pro-preview" ? "gemini-3.1-pro-preview" : model;
};

export const getAvailableModels = () => {
  return Object.keys(AvailableModels);
};

export const getModelName = (model: Model) => {
  if ((model as string) === "gemini-3-pro-preview") {
    return "Gemini 3 Pro Preview";
  }

  return AvailableModels[model] ?? model;
};

// Standard, uncached text-token rates: https://developers.openai.com/api/docs/pricing
// Gemini rates: https://ai.google.dev/gemini-api/docs/pricing (verified October 2026).
export const calculateCost = (model: string, input: number, output: number, timestamp = Date.now()) => {
  let cost = 0;

  switch (model) {
    case "gpt-6-luna":
      cost = (input / 1_000_000) * (input > 272_000 ? 0.2 : 0.1) + (output / 1_000_000) * (input > 272_000 ? 0.75 : 0.5);
      break;
    case "gpt-6.1-sol":
      cost = (input / 1_000_000) * (input > 272_000 ? 4.0 : 2.0) + (output / 1_000_000) * (input > 272_000 ? 15.0 : 10.0);
      break;
    case "gpt-6-astra":
      cost = (input / 1_000_000) * (input > 272_000 ? 20.0 : 10.0) + (output / 1_000_000) * (input > 272_000 ? 75.0 : 50.0);
      break;
    case "gpt-5.6-sol":
      cost = (input / 1_000_000) * (input > 272_000 ? 8.0 : 4.0) + (output / 1_000_000) * (input > 272_000 ? 30.0 : 20.0);
      break;
    case "gpt-5.6-terra":
      cost = (input / 1_000_000) * (input > 272_000 ? 4.0 : 2.0) + (output / 1_000_000) * (input > 272_000 ? 18.0 : 12.0);
      break;
    case "gpt-5.6-luna":
      cost = (input / 1_000_000) * (input > 272_000 ? 0.4 : 0.2) + (output / 1_000_000) * (input > 272_000 ? 1.8 : 1.2);
      break;
    case "gpt-5.4":
      cost = (input / 1_000_000) * (input > 272_000 ? 5.0 : 2.5) + (output / 1_000_000) * (input > 272_000 ? 22.5 : 15.0);
      break;
    case "gpt-5.4-mini":
      cost = (input / 1_000_000) * 0.75 + (output / 1_000_000) * 4.5;
      break;
    case "gpt-5.4-nano":
      cost = (input / 1_000_000) * 0.2 + (output / 1_000_000) * 1.25;
      break;
    case "gpt-4o":
      cost = (input / 1_000_000) * 2.5 + (output / 1_000_000) * 10.0;
      break;
    case "gpt-4o-mini":
      cost = (input / 1_000_000) * 0.15 + (output / 1_000_000) * 0.6;
      break;
    case "gemini-3-flash-preview":
      cost = (input / 1_000_000) * 0.5 + (output / 1_000_000) * 3.0;
      break;
    case "gemini-3.8-flash":
    case "gemini-3.6-flash": {
      const promotionalRate = timestamp < Date.UTC(2027, 0, 1);
      cost = (input / 1_000_000) * (promotionalRate ? 0.75 : 1.5) + (output / 1_000_000) * (promotionalRate ? 3.75 : 7.5);
      break;
    }
    case "gemini-3.5-flash-lite":
      cost = (input / 1_000_000) * 0.3 + (output / 1_000_000) * 2.5;
      break;
    case "gemini-3.1-flash-lite":
      cost = (input / 1_000_000) * 0.25 + (output / 1_000_000) * 1.5;
      break;
    case "gemini-3.1-pro-preview":
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

export const ReasoningLevels = {
  default: "Model Default",
  none: "Off",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra High",
  max: "Maximum",
} as const;

export type ReasoningLevel = keyof typeof ReasoningLevels;

// Model-specific levels: OpenAI model catalog and https://ai.google.dev/gemini-api/docs/thinking
export const getAvailableReasoningLevels = (model: Model): ReasoningLevel[] => {
  switch (getCurrentModel(model)) {
    case "gpt-6-luna":
    case "gpt-5.6-sol":
    case "gpt-5.6-terra":
    case "gpt-5.6-luna":
      return ["default", "none", "low", "medium", "high", "xhigh", "max"];
    case "gpt-6.1-sol":
    case "gpt-6-astra":
      return ["default", "low", "medium", "high", "xhigh", "max"];
    case "gpt-5.4":
    case "gpt-5.4-mini":
    case "gpt-5.4-nano":
      return ["default", "none", "low", "medium", "high", "xhigh"];
    case "gemini-3.8-flash":
    case "gemini-3.1-pro-preview":
      return ["default", "low", "medium", "high"];
    case "gemini-3.6-flash":
    case "gemini-3.5-flash-lite":
    case "gemini-3.1-flash-lite":
    case "gemini-3-flash-preview":
      return ["default", "minimal", "low", "medium", "high"];
    case "gemini-2.5-flash":
    case "gemini-2.5-flash-lite":
      return ["default", "none", "low", "medium", "high"];
    default:
      return ["default"];
  }
};

export const getReasoningLevel = (model: Model, level?: string): ReasoningLevel => {
  const selected = level as ReasoningLevel;
  return getAvailableReasoningLevels(model).includes(selected) ? selected : "default";
};

export const isReasoningModel = (model: Model) => getAvailableReasoningLevels(model).length > 1;

export const supportsTemperature = (model: Model, reasoningLevel?: string) =>
  isGeminiModel(model) || !isReasoningModel(model) || getReasoningLevel(model, reasoningLevel) === "none";

export const assertNoApiKeysInPrompt = (...texts: string[]) => {
  const preferences = getPreferenceValues<Preferences>();
  for (const value of [preferences.apikey, preferences.geminiApiKey]) {
    const key = value?.trim();
    if (key && texts.some((text) => text.includes(key))) {
      throw new Error("The selected text or instructions contain a configured API key. Select the intended text and try again.");
    }
  }
};

export const getModel = (model: Model) => {
  model = getCurrentModel(model);
  const providerPreferences = getPreferenceValues<Preferences>();

  if (isGeminiModel(model)) {
    const geminiApiKey = providerPreferences.geminiApiKey?.trim();
    if (!geminiApiKey) {
      throw new Error("Gemini API Key is missing. Add it in extension settings.");
    }

    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    return google(model);
  }

  const openAIApiKey = providerPreferences.apikey?.trim();
  if (!openAIApiKey) {
    throw new Error("OpenAI API Key is missing. Add it in extension settings.");
  }

  const openai = createOpenAI({ apiKey: openAIApiKey });
  return isReasoningModel(model) ? openai.responses(model) : openai.chat(model);
};
