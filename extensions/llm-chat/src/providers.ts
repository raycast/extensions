/**
 * Provider configurations for various LLM services.
 */

export type ThinkingPlacement = "topLevel" | "extraBody";

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  thinkingBody?: (enabled: boolean, model?: string) => Record<string, unknown> | null;
  thinkingPlacement?: ThinkingPlacement;
  thinkingDirective?: (enabled: boolean, model?: string) => string | null;
  defaultModels: string[];
}

function isQwenThinkingOnlyModel(model?: string): boolean {
  if (!model) return false;
  const lower = model.toLowerCase();
  return lower.startsWith("qwq") || lower.includes("-thinking");
}

function isKimiThinkingOnlyModel(model?: string): boolean {
  if (!model) return false;
  return model.toLowerCase().includes("-thinking");
}

function isDeepSeekReasoningModel(model?: string): boolean {
  if (!model) return false;
  return model.toLowerCase().includes("reasoner");
}

function supportsDoubaoThinkingField(model?: string): boolean {
  if (!model) return false;
  const lower = model.toLowerCase();
  return lower.includes("seed-1-6") || lower.includes("seed-1.6") || lower.includes("seed-1-8") || lower.includes("seed-2");
}

export const PROVIDERS: Record<string, ProviderConfig> = {
  glm: {
    name: "GLM (智谱)",
    baseUrl: "https://api.z.ai/api/paas/v4",
    thinkingBody: (enabled) => ({ thinking: { type: enabled ? "enabled" : "disabled" } }),
    thinkingPlacement: "topLevel",
    defaultModels: ["glm-5", "glm-4.7", "glm-4.6", "glm-4.5", "glm-4-plus", "glm-4"],
  },
  kimi: {
    name: "Kimi (Moonshot)",
    baseUrl: "https://api.moonshot.cn/v1",
    thinkingBody: (enabled, model) => {
      if (!enabled && isKimiThinkingOnlyModel(model)) {
        return null;
      }
      return { thinking: { type: enabled ? "enabled" : "disabled" } };
    },
    thinkingPlacement: "topLevel",
    defaultModels: ["kimi-k2.5", "kimi-k2", "moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k"],
  },
  qwen: {
    name: "Qwen (通义千问)",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    thinkingBody: (enabled, model) => {
      if (!enabled && isQwenThinkingOnlyModel(model)) {
        return null;
      }
      return { enable_thinking: enabled };
    },
    thinkingPlacement: "topLevel",
    thinkingDirective: (enabled, model) => {
      if (isQwenThinkingOnlyModel(model)) {
        return null;
      }
      return enabled ? "/think" : "/no_think";
    },
    defaultModels: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-long", "qwq-plus", "qwq-32b"],
  },
  minimax: {
    name: "MiniMax",
    baseUrl: "https://api.minimax.chat/v1",
    defaultModels: ["MiniMax-M2.1", "MiniMax-M2", "MiniMax-M1"],
  },
  doubao: {
    name: "Doubao (字节跳动)",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    thinkingBody: (enabled, model) => {
      if (!supportsDoubaoThinkingField(model)) {
        return null;
      }
      return { thinking: { type: enabled ? "enabled" : "disabled" } };
    },
    thinkingPlacement: "topLevel",
    defaultModels: ["doubao-1.5-pro-256k", "doubao-1.5-pro-32k", "doubao-1.5-lite-32k"],
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    thinkingBody: (enabled, model) => {
      if (isDeepSeekReasoningModel(model) || !enabled) {
        return null;
      }
      return { thinking: { type: "enabled" } };
    },
    thinkingPlacement: "topLevel",
    defaultModels: ["deepseek-chat", "deepseek-reasoner"],
  },
  custom: {
    name: "Custom",
    baseUrl: "",
    defaultModels: [],
  },
};

export function getProviderConfig(providerKey: string): ProviderConfig {
  return PROVIDERS[providerKey] || PROVIDERS.custom;
}

export function getBaseUrl(providerKey: string, customBaseUrl?: string): string {
  if (providerKey === "custom") {
    if (!customBaseUrl) throw new Error("Custom Base URL is required when using the Custom provider");
    if (!customBaseUrl.startsWith("https://")) throw new Error("Custom Base URL must start with https://");
    return customBaseUrl.replace(/\/+$/, "");
  }
  return getProviderConfig(providerKey).baseUrl;
}

export function getThinkingBody(providerKey: string, enabled: boolean, model?: string): Record<string, unknown> | null {
  const config = getProviderConfig(providerKey);
  return config.thinkingBody ? config.thinkingBody(enabled, model) : null;
}

export function getThinkingDirective(providerKey: string, enabled: boolean, model?: string): string | null {
  const config = getProviderConfig(providerKey);
  return config.thinkingDirective ? config.thinkingDirective(enabled, model) : null;
}
