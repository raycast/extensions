import { describe, expect, it } from "vitest";
import {
  modelProviderIcon,
  providerIcon,
  statusProviderIcon,
} from "./provider-icons";

describe("provider icons", () => {
  it.each([
    ["Anthropic", "provider-anthropic.svg"],
    ["DeepSeek", "provider-deepseek.svg"],
    ["Google", "provider-google-gemini.svg"],
    ["Meta", "provider-meta.svg"],
    ["Minimax", "provider-minimax.svg"],
    ["Mistral", "provider-mistral.svg"],
    ["OpenAI", "provider-openai.svg"],
    ["Qwen", "provider-qwen.svg"],
  ])("maps %s to its local brand asset", (provider, asset) => {
    expect(providerIcon(provider)).toBe(asset);
  });

  it("does not pretend an unknown provider has a brand asset", () => {
    expect(providerIcon("Other")).toBeUndefined();
  });

  it.each([
    ["Claude", "provider-anthropic.svg"],
    ["AWS Bedrock", "provider-aws.svg"],
    ["Azure OpenAI", "provider-azure.svg"],
    ["ByteDance", "provider-byteplus.svg"],
    ["Google AI / Vertex", "provider-google-gemini.svg"],
    ["Llama", "provider-meta.svg"],
    ["Alibaba Qwen", "provider-qwen.svg"],
    ["Grok", "provider-xai.svg"],
  ])("normalizes provider alias %s", (provider, asset) => {
    expect(providerIcon(provider)).toBe(asset);
  });

  it.each([
    ["openai", "provider-openai.svg"],
    ["anthropic", "provider-anthropic.svg"],
    ["google", "provider-google-gemini.svg"],
    ["azure", "provider-azure.svg"],
    ["xai", "provider-xai.svg"],
    ["deepseek", "provider-deepseek.svg"],
    ["groq", "provider-groq.svg"],
    ["openrouter", "provider-openrouter.svg"],
    ["aws", "provider-aws.svg"],
    ["mistral", "provider-mistral.svg"],
    ["minimax", "provider-minimax.svg"],
    ["byteplus", "provider-byteplus.svg"],
  ])("maps status id %s to its brand asset", (id, asset) => {
    expect(statusProviderIcon(id)).toBe(asset);
  });

  it.each([
    ["gpt-5.6-luna", "provider-openai.svg"],
    ["claude-sonnet-4", "provider-anthropic.svg"],
    ["gemini-3-flash", "provider-google-gemini.svg"],
    ["MiniMax-M3", "provider-minimax.svg"],
    ["deepseek-chat", "provider-deepseek.svg"],
    ["mistral-large", "provider-mistral.svg"],
    ["qwen3-coder", "provider-qwen.svg"],
    ["llama-4-maverick", "provider-meta.svg"],
    ["grok-4", "provider-xai.svg"],
  ])("infers model %s provider asset", (model, asset) => {
    expect(modelProviderIcon(model)).toBe(asset);
  });
});
