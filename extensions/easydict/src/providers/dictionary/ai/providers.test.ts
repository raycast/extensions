import { beforeEach, describe, expect, it, vi } from "vitest";

import { EASYDICT_VERSION } from "@/consts";
import { resolveAIProviderRuntimeConfig } from "@/providers/profiles/runtime";
import type { OpenAICompatibleProfile, RaycastAIProfile } from "@/providers/profiles/types";
import { CancelledError } from "@/shared/errors";

import { createAIDictionaryProvider, type NativeJSONUnsupportedHandler } from "./index";

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
  getPreferenceValues: () => ({}),
}));
vi.mock("@xsai/stream-text", () => ({ streamText: testDoubles.streamText }));
vi.mock("@/shared/http", () => ({ timedFetch: { native: testDoubles.nativeFetch } }));
vi.mock("@/shared/logger", () => ({
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

    const result = await createProvider(createRaycastProfile()).request(createQuery());

    expect(testDoubles.ask).toHaveBeenCalledWith(
      expect.stringContaining(JSON.stringify("run")),
      expect.objectContaining({ model: "test-model", creativity: "none" }),
    );
    expect(result.content.sections[0]).toEqual({ kind: "translation", text: "跑", lemma: "run" });
    expect(result.content.sections).toHaveLength(2);
  });

  it("collects and parses an OpenAI-compatible dictionary completion without exposing partial JSON", async () => {
    const response = JSON.stringify(createResponse());
    testDoubles.streamText.mockReturnValue({
      textStream: createTextStream([response.slice(0, 20), response.slice(20)]),
    });

    const result = await createProvider(createOpenAIProfile()).request(createQuery());

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
    expect(result.content.sections[0]).toEqual({ kind: "translation", text: "跑", lemma: "run" });
  });

  it("omits the API key for a keyless OpenAI-compatible dictionary completion", async () => {
    const response = JSON.stringify(createResponse());
    testDoubles.streamText.mockReturnValue({ textStream: createTextStream([response]) });

    await createProvider(createOpenAIProfile("")).request(createQuery());

    expect(testDoubles.streamText).toHaveBeenCalledWith(expect.not.objectContaining({ apiKey: expect.anything() }));
    expect(testDoubles.streamText.mock.calls[0][0]).not.toHaveProperty("headers");
  });

  it("falls back from unsupported native JSON and reports the configuration change", async () => {
    const response = JSON.stringify(createResponse());
    const onNativeJSONUnsupported = vi.fn();
    testDoubles.streamText
      .mockReturnValueOnce({
        textStream: createFailingTextStream(new Error("response_format json_object is not supported")),
      })
      .mockReturnValueOnce({ textStream: createTextStream([response]) });

    const profile = createOpenAIProfile("test-key", "https://opencode.ai/zen/go/v1");
    await createProvider(profile, onNativeJSONUnsupported).request(createQuery());

    expect(testDoubles.streamText).toHaveBeenCalledTimes(2);
    const [first, retry] = testDoubles.streamText.mock.calls.map(([options]) => options);
    expect(first.responseFormat).toEqual({ type: "json_object" });
    expect(retry).not.toHaveProperty("responseFormat");
    expect(first.headers?.["x-opencode-session"]).toEqual(expect.stringMatching(/\S/));
    expect(retry.headers).toEqual(first.headers);
    expect(onNativeJSONUnsupported).toHaveBeenCalledWith({ id: profile.id, name: profile.name }, undefined);
  });

  it("retries malformed native JSON without changing the configuration", async () => {
    const response = JSON.stringify(createResponse());
    const onNativeJSONUnsupported = vi.fn();
    testDoubles.streamText
      .mockReturnValueOnce({ textStream: createTextStream(["not-json"]) })
      .mockReturnValueOnce({ textStream: createTextStream([response]) });

    const profile = createOpenAIProfile("test-key", "https://opencode.ai/zen/go/v1");
    await createProvider(profile, onNativeJSONUnsupported).request(createQuery());

    expect(testDoubles.streamText).toHaveBeenCalledTimes(2);
    const [first, retry] = testDoubles.streamText.mock.calls.map(([options]) => options);
    expect(first.responseFormat).toEqual({ type: "json_object" });
    expect(retry).not.toHaveProperty("responseFormat");
    expect(first.headers?.["x-opencode-session"]).toEqual(expect.stringMatching(/\S/));
    expect(retry.headers).toEqual(first.headers);
    expect(onNativeJSONUnsupported).not.toHaveBeenCalled();
  });

  it("does not start a prompt retry when cancelled while saving the native JSON fallback", async () => {
    let finishNotification!: () => void;
    const notification = new Promise<void>((resolve) => {
      finishNotification = resolve;
    });
    const onNativeJSONUnsupported = vi.fn(() => notification);
    testDoubles.streamText
      .mockReturnValueOnce({
        textStream: createFailingTextStream(new Error("response_format json_object is not supported")),
      })
      .mockReturnValueOnce({ textStream: createTextStream([JSON.stringify(createResponse())]) });
    const controller = new AbortController();
    const profile = createOpenAIProfile();
    const pending = createProvider(profile, onNativeJSONUnsupported).request(createQuery(), {
      signal: controller.signal,
    });
    await vi.waitFor(() => expect(onNativeJSONUnsupported).toHaveBeenCalledOnce());
    controller.abort();
    finishNotification();
    await expect(pending).rejects.toBeInstanceOf(CancelledError);
    expect(onNativeJSONUnsupported).toHaveBeenCalledWith({ id: profile.id, name: profile.name }, controller.signal);
    expect(testDoubles.streamText).toHaveBeenCalledTimes(1);
  });

  it("adds fresh OpenCode Go headers to each dictionary query and preserves authentication", async () => {
    const response = JSON.stringify(createResponse());
    testDoubles.streamText.mockImplementation(() => ({ textStream: createTextStream([response]) }));
    const provider = createProvider(createOpenAIProfile("test-key", "https://opencode.ai/zen/go/v1/chat/completions"));

    await provider.request(createQuery());
    await provider.request(createQuery());

    const [first, second] = testDoubles.streamText.mock.calls.map(([options]) => options);
    expect(first).toEqual(
      expect.objectContaining({
        apiKey: "test-key",
        headers: {
          "User-Agent": `raycast-easydict/${EASYDICT_VERSION}`,
          "x-opencode-session": expect.any(String),
        },
      }),
    );
    expect(second.headers["x-opencode-session"]).not.toBe(first.headers["x-opencode-session"]);
  });

  it("does not fall back for unrelated request errors", async () => {
    testDoubles.streamText.mockReturnValue({
      textStream: createFailingTextStream(new Error("401 Invalid API key")),
    });

    await expect(createProvider(createOpenAIProfile()).request(createQuery())).rejects.toThrow("401 Invalid API key");
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

function createOpenAIProfile(
  apiKey = "test-key",
  endpoint = "https://example.com/v1/chat/completions",
): OpenAICompatibleProfile {
  return {
    id: "openai",
    adapter: "openai-compatible",
    name: "OpenAI-Compatible",
    enabled: true,
    order: 0,
    icon: { kind: "initials" },
    wordResultMode: "dictionary",
    endpoint,
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

function createProvider(
  profile: OpenAICompatibleProfile | RaycastAIProfile,
  onNativeJSONUnsupported?: NativeJSONUnsupportedHandler,
) {
  const result = resolveAIProviderRuntimeConfig(profile);
  if (result.kind === "issue") throw new Error(result.message);
  return createAIDictionaryProvider(result.config, onNativeJSONUnsupported);
}
