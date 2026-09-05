import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OpenAICompatibleProfile } from "@/ai-providers/types";

import { ConfiguredOpenAICompatibleTranslateProvider } from "./openai-compatible";

const testDoubles = vi.hoisted(() => ({
  nativeFetch: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@raycast/api", () => ({}));
vi.mock("@xsai/stream-text", () => ({ streamText: testDoubles.streamText }));
vi.mock("@/utils/http", () => ({ timedFetch: { native: testDoubles.nativeFetch } }));
vi.mock("@/utils/logger", () => ({
  createTimer: () => ({ done: vi.fn(), fail: vi.fn() }),
  logError: vi.fn(),
  logTrace: vi.fn(),
}));

beforeEach(() => {
  testDoubles.streamText.mockReset();
});

describe("OpenAI-compatible translation provider", () => {
  it("omits the API key for a keyless completion", async () => {
    testDoubles.streamText.mockReturnValue({ textStream: createTextStream(["你好"]) });

    const request = new ConfiguredOpenAICompatibleTranslateProvider(createProfile("")).request({
      word: "hello",
      fromLanguage: "en",
      toLanguage: "zh-CHS",
    });
    await request.next();
    await request.next();

    expect(testDoubles.streamText).toHaveBeenCalledWith(expect.not.objectContaining({ apiKey: expect.anything() }));
  });
});

function createProfile(apiKey: string): OpenAICompatibleProfile {
  return {
    id: "openai-compatible",
    adapter: "openai-compatible",
    name: "OpenAI-Compatible",
    enabled: true,
    order: 0,
    icon: { kind: "initials" },
    wordResultMode: "translation",
    endpoint: "https://example.com/v1",
    model: "test-model",
    apiKey,
    tokenLimitMode: "max-tokens",
    jsonOutputMode: "prompt",
  };
}

async function* createTextStream(chunks: string[]) {
  yield* chunks;
}
