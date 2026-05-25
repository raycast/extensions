import { ProviderId } from "./types";

export interface ModelEntry {
  id: string;
  title: string;
}

interface ProviderModels {
  fast: ModelEntry;
  pro: ModelEntry;
  all: ModelEntry[];
}

const MODEL_CATALOG: Record<ProviderId, ProviderModels> = {
  deepseek: {
    fast: { id: "deepseek-v4-flash", title: "V4 Flash" },
    pro: { id: "deepseek-v4-pro", title: "V4 Pro" },
    all: [
      { id: "deepseek-v4-flash", title: "V4 Flash" },
      { id: "deepseek-v4-pro", title: "V4 Pro" },
    ],
  },
  mimo: {
    fast: { id: "mimo-v2.5", title: "V2.5" },
    pro: { id: "mimo-v2.5-pro", title: "V2.5 Pro" },
    all: [
      { id: "mimo-v2.5-pro", title: "V2.5 Pro" },
      { id: "mimo-v2.5", title: "V2.5" },
      { id: "mimo-v2-pro", title: "V2 Pro" },
      { id: "mimo-v2-omni", title: "V2 Omni" },
    ],
  },
  gemini: {
    fast: { id: "gemini-3.1-flash-lite-preview", title: "3.1 Flash Lite (Preview)" },
    pro: { id: "gemini-3.1-pro-preview", title: "3.1 Pro (Preview)" },
    all: [
      { id: "gemini-3.1-flash-lite-preview", title: "3.1 Flash Lite (Preview)" },
      { id: "gemini-3-flash-preview", title: "3.0 Flash (Preview)" },
      { id: "gemini-3.1-pro-preview", title: "3.1 Pro (Preview)" },
      { id: "gemini-2.5-flash", title: "2.5 Flash" },
      { id: "gemini-2.5-flash-lite", title: "2.5 Flash Lite" },
      { id: "gemini-2.5-pro", title: "2.5 Pro" },
    ],
  },
  kimi: {
    fast: { id: "kimi-for-coding", title: "Kimi for Coding" },
    pro: { id: "kimi-for-coding", title: "Kimi for Coding" },
    all: [
      { id: "kimi-for-coding", title: "Kimi for Coding" },
      { id: "kimi-k2.6", title: "K2.6 (Custom endpoint)" },
      { id: "kimi-k2.5", title: "K2.5 (Custom endpoint)" },
    ],
  },
  openai: {
    fast: { id: "gpt-4.1-mini", title: "GPT-4.1 Mini" },
    pro: { id: "gpt-4.1", title: "GPT-4.1" },
    all: [
      { id: "gpt-5.4-nano", title: "GPT-5.4 Nano" },
      { id: "gpt-5.4-mini", title: "GPT-5.4 Mini" },
      { id: "gpt-5.4", title: "GPT-5.4" },
      { id: "gpt-4.1-nano", title: "GPT-4.1 Nano" },
      { id: "gpt-4.1-mini", title: "GPT-4.1 Mini" },
      { id: "gpt-4.1", title: "GPT-4.1" },
      { id: "o4-mini", title: "o4 Mini" },
      { id: "gpt-4o", title: "GPT-4o" },
      { id: "gpt-4o-mini", title: "GPT-4o Mini" },
    ],
  },
};

export function getTierLabel(tier: string): string {
  switch (tier) {
    case "fast":
      return "Fast";
    case "pro":
      return "Pro";
    case "custom":
      return "Custom";
    default:
      return tier;
  }
}

export function resolveModel(providerId: ProviderId, tier: string, customModel: string): string {
  if (tier === "custom") return customModel;
  if (tier === "fast" || tier === "pro") return MODEL_CATALOG[providerId][tier].id;
  return customModel;
}
