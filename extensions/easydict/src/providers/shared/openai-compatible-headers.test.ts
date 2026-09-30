import { describe, expect, it, vi } from "vitest";

import { EASYDICT_VERSION } from "@/consts";

import { getOpenAICompatibleRequestHeaders } from "./openai-compatible-headers";

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({}) }));

describe("OpenAI-compatible request headers", () => {
  it.each([
    "https://opencode.ai/zen/go/v1",
    "https://opencode.ai/zen/go/v1/",
    "https://opencode.ai/zen/go/v1/chat/completions",
  ])("adds OpenCode Go headers for %s", (endpoint) => {
    expect(getOpenAICompatibleRequestHeaders(endpoint)).toEqual({
      "User-Agent": `raycast-easydict/${EASYDICT_VERSION}`,
      "x-opencode-session": expect.stringMatching(/^[0-9a-f-]{36}$/),
    });
  });

  it.each([
    "https://opencode.ai/zen/v1",
    "http://opencode.ai/zen/go/v1",
    "https://api.opencode.ai/zen/go/v1",
    "https://opencode.ai/zen/go/v10",
    "https://opencode.ai/zen/go/v1/extra",
    "https://opencode.ai.example/zen/go/v1",
    "not a URL",
  ])("omits OpenCode Go headers for %s", (endpoint) => {
    expect(getOpenAICompatibleRequestHeaders(endpoint)).toBeUndefined();
  });
});
