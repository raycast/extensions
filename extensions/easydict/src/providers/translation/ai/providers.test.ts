import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OpenAICompatibleProfile } from "@/ai-providers/types";
import { EASYDICT_VERSION } from "@/consts";

import { ConfiguredOpenAICompatibleTranslateProvider } from "./openai-compatible";

const testDoubles = vi.hoisted(() => ({
  nativeFetch: vi.fn(),
  streamText: vi.fn(),
}));

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({}) }));
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
    expect(testDoubles.streamText.mock.calls[0][0]).not.toHaveProperty("headers");
  });

  it("adds fresh OpenCode Go headers to each translation query and preserves authentication", async () => {
    testDoubles.streamText.mockImplementation(() => ({ textStream: createTextStream(["你好"]) }));
    const provider = new ConfiguredOpenAICompatibleTranslateProvider(
      createProfile("test-key", "https://opencode.ai/zen/go/v1/chat/completions/"),
    );

    expect(await collect(provider.request(createQuery()))).toEqual([{ content: "你好", role: "assistant" }]);
    expect(await collect(provider.request(createQuery()))).toEqual([{ content: "你好", role: "assistant" }]);

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
});

function createProfile(apiKey: string, endpoint = "https://example.com/v1"): OpenAICompatibleProfile {
  return {
    id: "openai-compatible",
    adapter: "openai-compatible",
    name: "OpenAI-Compatible",
    enabled: true,
    order: 0,
    icon: { kind: "initials" },
    wordResultMode: "translation",
    endpoint,
    model: "test-model",
    apiKey,
    tokenLimitMode: "max-tokens",
    jsonOutputMode: "prompt",
  };
}

function createQuery() {
  return { word: "hello", fromLanguage: "en", toLanguage: "zh-CHS" };
}

async function collect(iterable: AsyncIterable<unknown>) {
  const chunks = [];
  for await (const chunk of iterable) chunks.push(chunk);
  return chunks;
}

async function* createTextStream(chunks: string[]) {
  yield* chunks;
}
