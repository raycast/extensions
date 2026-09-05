import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OpenAICompatibleProfile, RaycastAIProfile } from "@/ai-providers/types";

import { OpenAICompatibleDictionaryProvider } from "./openai-compatible";
import { RaycastAIDictionaryProvider } from "./raycast-ai";

const testDoubles = vi.hoisted(() => ({
  ask: vi.fn(),
  canAccess: vi.fn(() => true),
  nativeFetch: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  AI: {
    Model: { Test_Model: "test-model" },
    ask: testDoubles.ask,
  },
  environment: { canAccess: testDoubles.canAccess, isDevelopment: false },
}));
vi.mock("@xsai/stream-text", () => ({ streamText: testDoubles.streamText }));
vi.mock("@/utils/http", () => ({ timedFetch: { native: testDoubles.nativeFetch } }));
vi.mock("@/utils/logger", () => ({
  createTimer: () => ({ done: vi.fn(), fail: vi.fn() }),
  logError: vi.fn(),
  logTrace: vi.fn(),
  logWarn: vi.fn(),
}));

beforeEach(() => {
  testDoubles.ask.mockReset();
  testDoubles.canAccess.mockReset().mockReturnValue(true);
  testDoubles.streamText.mockReset();
});

describe("AI dictionary provider adapters", () => {
  it("parses a Raycast AI dictionary completion", async () => {
    testDoubles.ask.mockResolvedValue(JSON.stringify(createResponse()));

    const result = await new RaycastAIDictionaryProvider(createRaycastProfile()).request(createQuery());

    expect(testDoubles.ask).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify("run")),
      expect.objectContaining({ model: "test-model", creativity: "none" }),
    );
    expect(result.result).toEqual(createResponse());
    expect(result.displaySections).toHaveLength(2);
  });

  it("collects and parses an OpenAI-compatible dictionary completion without exposing partial JSON", async () => {
    const response = JSON.stringify(createResponse());
    testDoubles.streamText.mockReturnValue({
      textStream: createTextStream([response.slice(0, 20), response.slice(20)]),
    });

    const result = await new OpenAICompatibleDictionaryProvider(createOpenAIProfile()).request(createQuery());

    expect(testDoubles.streamText).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "https://example.com/v1",
        apiKey: "test-key",
        model: "test-model",
        max_tokens: 3000,
        fetch: testDoubles.nativeFetch,
        responseFormat: { type: "json_object" },
      }),
    );
    expect(result.result).toEqual(createResponse());
    expect(result.displaySections?.[0].items[0].title).toBe("跑");
  });

  it("omits the API key for a keyless OpenAI-compatible dictionary completion", async () => {
    const response = JSON.stringify(createResponse());
    testDoubles.streamText.mockReturnValue({ textStream: createTextStream([response]) });

    await new OpenAICompatibleDictionaryProvider(createOpenAIProfile("")).request(createQuery());

    expect(testDoubles.streamText).toHaveBeenCalledWith(expect.not.objectContaining({ apiKey: expect.anything() }));
  });

  it("falls back from unsupported native JSON and reports the configuration change", async () => {
    const response = JSON.stringify(createResponse());
    const onNativeJSONUnsupported = vi.fn();
    testDoubles.streamText
      .mockReturnValueOnce({
        textStream: createFailingTextStream(new Error("response_format json_object is not supported")),
      })
      .mockReturnValueOnce({ textStream: createTextStream([response]) });

    const profile = createOpenAIProfile();
    await new OpenAICompatibleDictionaryProvider(profile, onNativeJSONUnsupported).request(createQuery());

    expect(testDoubles.streamText).toHaveBeenCalledTimes(2);
    expect(testDoubles.streamText.mock.calls[0][0]).toEqual(
      expect.objectContaining({ responseFormat: { type: "json_object" } }),
    );
    expect(testDoubles.streamText.mock.calls[1][0]).not.toHaveProperty("responseFormat");
    expect(onNativeJSONUnsupported).toHaveBeenCalledWith({ ...profile, jsonOutputMode: "prompt" });
  });

  it("retries malformed native JSON without changing the configuration", async () => {
    const response = JSON.stringify(createResponse());
    const onNativeJSONUnsupported = vi.fn();
    testDoubles.streamText
      .mockReturnValueOnce({ textStream: createTextStream(["not-json"]) })
      .mockReturnValueOnce({ textStream: createTextStream([response]) });

    const profile = createOpenAIProfile();
    await new OpenAICompatibleDictionaryProvider(profile, onNativeJSONUnsupported).request(createQuery());

    expect(testDoubles.streamText).toHaveBeenCalledTimes(2);
    expect(testDoubles.streamText.mock.calls[1][0]).not.toHaveProperty("responseFormat");
    expect(onNativeJSONUnsupported).not.toHaveBeenCalled();
  });

  it("does not fall back for unrelated request errors", async () => {
    testDoubles.streamText.mockReturnValue({
      textStream: createFailingTextStream(new Error("401 Invalid API key")),
    });

    await expect(new OpenAICompatibleDictionaryProvider(createOpenAIProfile()).request(createQuery())).rejects.toThrow(
      "401 Invalid API key",
    );
    expect(testDoubles.streamText).toHaveBeenCalledTimes(1);
  });
});

function createQuery() {
  return { word: "run", fromLanguage: "en", toLanguage: "zh-CHS", isWord: true };
}

function createResponse() {
  return {
    translation: "跑",
    entry: {
      headword: "run",
      pronunciation: "rʌn",
      senses: [{ partOfSpeech: "verb", meanings: ["跑"], examples: [] }],
      forms: [],
    },
  };
}

function createRaycastProfile(): RaycastAIProfile {
  return {
    id: "raycast",
    adapter: "raycast-ai",
    name: "Raycast",
    enabled: true,
    order: 0,
    icon: { kind: "preset", name: "raycast" },
    wordResultMode: "dictionary",
    model: "test-model",
  };
}

function createOpenAIProfile(apiKey = "test-key"): OpenAICompatibleProfile {
  return {
    id: "openai",
    adapter: "openai-compatible",
    name: "OpenAI-Compatible",
    enabled: true,
    order: 0,
    icon: { kind: "initials" },
    wordResultMode: "dictionary",
    endpoint: "https://example.com/v1/chat/completions",
    model: "test-model",
    apiKey,
    tokenLimitMode: "max-tokens",
    jsonOutputMode: "json-object",
  };
}

async function* createTextStream(chunks: string[]) {
  yield* chunks;
}

function createFailingTextStream(error: Error): AsyncIterable<string> {
  return {
    [Symbol.asyncIterator]() {
      return {
        next: () => Promise.reject(error),
      };
    },
  };
}
