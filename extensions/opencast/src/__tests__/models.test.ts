import { describe, expect, it } from "vitest";
import type { ProviderListResponse } from "@opencode-ai/sdk/v2";
import { mapProviderResponseToModels } from "../lib/model-options";

describe("mapProviderResponseToModels", () => {
  it("maps providers into sorted model options", () => {
    const models = mapProviderResponseToModels({
      all: [
        {
          id: "openai",
          name: "OpenAI",
          env: [],
          models: {
            "gpt-5": {
              id: "gpt-5",
              name: "GPT-5",
              release_date: "2026-01-01",
              attachment: false,
              reasoning: true,
              temperature: true,
              tool_call: true,
              limit: { context: 1, output: 1 },
              options: {},
            },
          },
        },
        {
          id: "anthropic",
          name: "Anthropic",
          env: [],
          models: {
            "claude-sonnet-4": {
              id: "claude-sonnet-4",
              name: "Claude Sonnet 4",
              release_date: "2026-01-01",
              attachment: false,
              reasoning: true,
              temperature: true,
              tool_call: true,
              limit: { context: 1, output: 1 },
              options: {},
            },
          },
        },
      ],
      default: { openai: "gpt-5" },
      connected: ["openai"],
    } as ProviderListResponse);

    expect(models[0]).toMatchObject({
      providerID: "openai",
      modelID: "gpt-5",
      isConnected: true,
      isDefault: true,
    });
    expect(models[1]).toMatchObject({
      providerID: "anthropic",
      modelID: "claude-sonnet-4",
    });
  });
});
