import type { AI } from "@raycast/api";

// Representative models for transport and recovery tests, not the provider catalog.
export const models: AI.RegisteredModel[] = [
  {
    id: "mistral-medium-3-5",
    title: "Mistral Medium 3.5",
    icon: { source: { light: "extension-icon.png", dark: "extension-icon.png" } },
    description: "Mistral's multimodal model for coding and agentic tasks.",
    isLocal: false,
    contextWindow: 256000,
    capabilities: {
      systemMessage: { supported: true },
      temperature: { supported: true },
      streaming: { supported: true },
      tools: { supported: true },
      vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp"] },
      reasoningEffort: { supported: true, options: ["none", "high"], default: "high" },
    },
  },
  {
    id: "zai-glm-5-3",
    title: "GLM 5.3",
    icon: { source: { light: "extension-icon.png", dark: "extension-icon.png" } },
    description: "GLM 5.3 hosted by Mistral for long-context coding and agentic tasks.",
    isLocal: false,
    contextWindow: 1000000,
    capabilities: {
      systemMessage: { supported: true },
      temperature: { supported: true },
      streaming: { supported: true },
      tools: { supported: true },
      // @ai-sdk/mistral does not yet forward reasoning_effort for this model ID.
    },
  },
  {
    id: "zai-glm-5-2",
    title: "GLM 5.2",
    icon: { source: { light: "extension-icon.png", dark: "extension-icon.png" } },
    description: "GLM 5.2 hosted by Mistral for long-context coding and agentic tasks.",
    isLocal: false,
    contextWindow: 1000000,
    capabilities: {
      systemMessage: { supported: true },
      temperature: { supported: true },
      streaming: { supported: true },
      tools: { supported: true },
      reasoningEffort: { supported: true, options: ["none", "high"], default: "high" },
    },
  },
];
