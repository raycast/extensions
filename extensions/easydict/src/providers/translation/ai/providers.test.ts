import { beforeEach, describe, expect, it, vi } from "vitest";

import { EASYDICT_VERSION } from "@/consts";
import { TranslationType } from "@/core/results/kinds";
import type { StreamChunk, TranslationResult } from "@/core/results/types";
import { resolveAIProviderRuntimeConfig } from "@/providers/profiles/runtime";
import type { OpenAICompatibleProfile } from "@/providers/profiles/types";
import { CancelledError } from "@/shared/errors";

import { createAITranslationProvider } from "./index";

const testDoubles = vi.hoisted(() => ({
  nativeFetch: vi.fn(),
  streamText: vi.fn(),
  timerFail: vi.fn(),
}));

vi.mock("@raycast/api", () => ({ getPreferenceValues: () => ({}) }));
vi.mock("@xsai/stream-text", () => ({ streamText: testDoubles.streamText }));
vi.mock("@/shared/http", () => ({ timedFetch: { native: testDoubles.nativeFetch } }));
vi.mock("@/shared/logger", () => ({
  createTimer: () => ({ done: vi.fn(), fail: testDoubles.timerFail }),
  logError: vi.fn(),
  logTrace: vi.fn(),
}));

beforeEach(() => {
  testDoubles.streamText.mockReset();
  testDoubles.timerFail.mockReset();
});

describe("OpenAI-compatible translation provider", () => {
  it("omits the API key for a keyless completion", async () => {
    testDoubles.streamText.mockReturnValue({ textStream: createTextStream(["你好"]) });

    await collect(createProvider(createProfile("")).request(createQuery()));

    expect(testDoubles.streamText).toHaveBeenCalledWith(expect.not.objectContaining({ apiKey: expect.anything() }));
    expect(testDoubles.streamText.mock.calls[0][0]).not.toHaveProperty("headers");
  });

  it("adds fresh OpenCode Go headers to each translation query and preserves authentication", async () => {
    testDoubles.streamText.mockImplementation(() => ({ textStream: createTextStream(["你好"]) }));
    const provider = createProvider(createProfile("test-key", "https://opencode.ai/zen/go/v1/chat/completions/"));

    await collect(provider.request(createQuery()));
    await collect(provider.request(createQuery()));

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

  it.each([
    ["max-tokens", "max_tokens", "max_completion_tokens"],
    ["max-completion-tokens", "max_completion_tokens", "max_tokens"],
  ] as const)(
    "streams and returns the translation using %s",
    async (tokenLimitMode, tokenParameter, omittedParameter) => {
      testDoubles.streamText.mockReturnValue({ textStream: createTextStream(["你", "", "好"]) });
      const profile = {
        ...createProfile(" test-key ", " https://example.com/v1/chat/completions/ "),
        model: " test-model ",
        tokenLimitMode,
      };
      const query = createQuery();

      expect(await collect(createProvider(profile).request(query))).toEqual({
        chunks: [{ content: "你" }, { content: "好" }],
        result: {
          type: TranslationType.OpenAI,
          content: { kind: "translation", query, paragraphs: ["你好"] },
        },
      });
      const [options] = testDoubles.streamText.mock.calls[0];
      expect(options).toMatchObject({
        baseURL: "https://example.com/v1",
        model: "test-model",
        apiKey: "test-key",
        fetch: testDoubles.nativeFetch,
        [tokenParameter]: 2000,
      });
      expect(options).not.toHaveProperty(omittedParameter);
      expect(options.messages.at(-1)).toEqual({
        role: "user",
        content:
          "Translate the following English text into Chinese-Simplified:\n\n<source_text>\nhello\n</source_text>",
      });
    },
  );

  it("aborts a pending stream as cancellation without recording a failure", async () => {
    testDoubles.streamText.mockImplementation(({ abortSignal }: { abortSignal?: AbortSignal }) => ({
      textStream: new ReadableStream<string>({
        start(controller) {
          abortSignal?.addEventListener("abort", () => controller.error(new DOMException("Aborted", "AbortError")), {
            once: true,
          });
        },
      }),
    }));
    const controller = new AbortController();
    const request = createProvider(createProfile("")).request(createQuery(), {
      signal: controller.signal,
    });

    const pending = request.next();
    controller.abort();

    await expect(pending).rejects.toBeInstanceOf(CancelledError);
    expect(testDoubles.timerFail).not.toHaveBeenCalled();
  });

  it("normalizes a completion failure through the provider base class", async () => {
    testDoubles.streamText.mockImplementation(() => {
      throw new Error("Completion failed");
    });
    const request = createProvider(createProfile("")).request(createQuery());

    await expect(request.next()).rejects.toMatchObject({
      name: "RequestError",
      type: TranslationType.OpenAI,
      message: "Completion failed",
    });
    expect(testDoubles.timerFail).toHaveBeenCalledOnce();
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

async function collect(iterator: AsyncGenerator<StreamChunk, TranslationResult, unknown>) {
  const chunks: StreamChunk[] = [];
  while (true) {
    const next = await iterator.next();
    if (next.done) return { chunks, result: next.value };
    chunks.push(next.value);
  }
}

async function* createTextStream(chunks: string[]) {
  yield* chunks;
}

function createProvider(profile: OpenAICompatibleProfile) {
  const result = resolveAIProviderRuntimeConfig(profile);
  if (result.kind === "issue") throw new Error(result.message);
  return createAITranslationProvider(result.config);
}
