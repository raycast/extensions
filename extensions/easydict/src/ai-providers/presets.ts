/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

import type { ProviderIconConfig, TokenLimitMode } from "./types";

export interface OpenAICompatiblePreset {
  name: string;
  endpoint: string;
  website?: string;
  model: string;
  icon: ProviderIconConfig;
  tokenLimitMode: TokenLimitMode;
}

export const OPENAI_COMPATIBLE_PRESETS = {
  custom: {
    name: "OpenAI-Compatible",
    endpoint: "",
    model: "",
    icon: { kind: "initials" },
    tokenLimitMode: "max-tokens",
  },
  openai: {
    name: "OpenAI",
    endpoint: "https://api.openai.com/v1",
    website: "https://openai.com",
    model: "gpt-5.4-mini",
    icon: { kind: "preset", name: "openai" },
    tokenLimitMode: "max-completion-tokens",
  },
  gemini: {
    name: "Gemini",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai",
    website: "https://gemini.google.com",
    model: "gemini-3.5-flash",
    icon: { kind: "preset", name: "gemini" },
    tokenLimitMode: "max-tokens",
  },
  deepseek: {
    name: "DeepSeek",
    endpoint: "https://api.deepseek.com",
    website: "https://www.deepseek.com",
    model: "deepseek-v4-flash",
    icon: { kind: "preset", name: "deepseek" },
    tokenLimitMode: "max-tokens",
  },
  openrouter: {
    name: "OpenRouter",
    endpoint: "https://openrouter.ai/api/v1",
    website: "https://openrouter.ai",
    model: "openrouter/free",
    icon: { kind: "preset", name: "openrouter" },
    tokenLimitMode: "max-tokens",
  },
  siliconflow: {
    name: "SiliconFlow",
    endpoint: "https://api.siliconflow.cn/v1",
    website: "https://siliconflow.cn",
    model: "deepseek-ai/DeepSeek-V3",
    icon: { kind: "preset", name: "siliconflow" },
    tokenLimitMode: "max-tokens",
  },
  zhipu: {
    name: "Zhipu GLM",
    endpoint: "https://open.bigmodel.cn/api/paas/v4",
    website: "https://bigmodel.cn",
    model: "glm-5.2",
    icon: { kind: "preset", name: "zhipu" },
    tokenLimitMode: "max-tokens",
  },
  kimi: {
    name: "Kimi",
    endpoint: "https://api.moonshot.cn/v1",
    website: "https://platform.kimi.com",
    model: "kimi-k2.6",
    icon: { kind: "preset", name: "kimi" },
    tokenLimitMode: "max-completion-tokens",
  },
  minimax: {
    name: "MiniMax",
    endpoint: "https://api.minimaxi.com/v1",
    website: "https://platform.minimaxi.com",
    model: "MiniMax-M2.7",
    icon: { kind: "preset", name: "minimax" },
    tokenLimitMode: "max-tokens",
  },
  mimo: {
    name: "Xiaomi MiMo",
    endpoint: "https://api.xiaomimimo.com/v1",
    website: "https://mimo.mi.com",
    model: "mimo-v2.5",
    icon: { kind: "preset", name: "mimo" },
    tokenLimitMode: "max-tokens",
  },
  opencodeZen: {
    name: "OpenCode Zen",
    endpoint: "https://opencode.ai/zen/v1",
    website: "https://opencode.ai",
    model: "deepseek-v4-flash",
    icon: { kind: "favicon", website: "https://opencode.ai" },
    tokenLimitMode: "max-tokens",
  },
  opencodeGo: {
    name: "OpenCode Go",
    endpoint: "https://opencode.ai/zen/go/v1",
    website: "https://opencode.ai",
    model: "deepseek-v4-flash",
    icon: { kind: "favicon", website: "https://opencode.ai" },
    tokenLimitMode: "max-tokens",
  },
} as const satisfies Record<string, OpenAICompatiblePreset>;

export type OpenAICompatiblePresetName = keyof typeof OPENAI_COMPATIBLE_PRESETS;
