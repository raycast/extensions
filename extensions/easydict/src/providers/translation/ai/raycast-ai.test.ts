import { describe, expect, it, vi } from "vitest";

import type { RaycastAIProfile } from "@/ai-providers/types";
import { TranslationType } from "@/types/api";
import { CancelledError } from "@/utils/errors";

import { RaycastAITranslateProvider } from "./raycast-ai";

const testDoubles = vi.hoisted(() => ({
  ask: vi.fn(),
  canAccess: vi.fn(() => true),
}));

vi.mock("@raycast/api", () => ({
  AI: {
    Model: { Test_Model: "test-model" },
    ask: testDoubles.ask,
  },
  environment: { canAccess: testDoubles.canAccess },
}));

vi.mock("@/utils/logger", () => ({
  createTimer: () => ({ done: vi.fn(), fail: vi.fn() }),
  logError: vi.fn(),
  logTrace: vi.fn(),
}));

const profile: RaycastAIProfile = {
  id: "raycast-ai-test",
  adapter: "raycast-ai",
  name: "Raycast AI Test",
  enabled: true,
  order: 0,
  model: "test-model",
  icon: { kind: "preset", name: "raycast" },
  wordResultMode: "translation",
};

describe("Raycast AI streaming provider", () => {
  it("yields data events and returns the final completion", async () => {
    const stream = createAIAnswer();
    testDoubles.ask.mockReturnValueOnce(stream.answer);
    const iterator = new RaycastAITranslateProvider(profile).request({
      word: "hello",
      fromLanguage: "en",
      toLanguage: "zh-CHS",
    });

    const first = iterator.next();
    stream.emit("你");
    await expect(first).resolves.toEqual({ done: false, value: { content: "你", role: "assistant" } });

    const second = iterator.next();
    stream.emit("好");
    await expect(second).resolves.toEqual({ done: false, value: { content: "好", role: "assistant" } });

    const completion = iterator.next();
    stream.resolve("你好");
    const result = await completion;
    expect(result.done).toBe(true);
    expect(result.value).toMatchObject({ translations: ["你好"], result: { translatedText: "你好" } });
  });

  it("uses the final completion when no data event is emitted", async () => {
    const stream = createAIAnswer();
    testDoubles.ask.mockReturnValueOnce(stream.answer);
    const iterator = new RaycastAITranslateProvider(profile).request({
      word: "hello",
      fromLanguage: "en",
      toLanguage: "zh-CHS",
    });

    const completion = iterator.next();
    stream.resolve("你好");
    await expect(completion).resolves.toMatchObject({
      done: true,
      value: { translations: ["你好"] },
    });
  });

  it("settles an aborted request as normal cancellation", async () => {
    const stream = createAIAnswer();
    testDoubles.ask.mockReturnValueOnce(stream.answer);
    const abortController = new AbortController();
    const iterator = new RaycastAITranslateProvider(profile).request(
      { word: "hello", fromLanguage: "en", toLanguage: "zh-CHS" },
      { signal: abortController.signal },
    );

    const pending = iterator.next();
    abortController.abort();
    await expect(pending).rejects.toBeInstanceOf(CancelledError);

    stream.emit("stale");
    stream.resolve("stale");
  });

  it("normalizes an AI failure through the provider base class", async () => {
    const stream = createAIAnswer();
    testDoubles.ask.mockReturnValueOnce(stream.answer);
    const iterator = new RaycastAITranslateProvider(profile).request({
      word: "hello",
      fromLanguage: "en",
      toLanguage: "zh-CHS",
    });

    const pending = iterator.next();
    stream.reject(new Error("AI failed"));
    await expect(pending).rejects.toMatchObject({
      name: "RequestError",
      type: TranslationType.OpenAI,
      message: "AI failed",
    });
  });
});

function createAIAnswer() {
  let emitData: ((chunk: string) => void) | undefined;
  let resolvePromise!: (text: string) => void;
  let rejectPromise!: (error: unknown) => void;
  const answer = new Promise<string>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  }) as Promise<string> & { on: (event: "data", listener: (chunk: string) => void) => void };
  answer.on = (_event, listener) => {
    emitData = listener;
  };

  return {
    answer,
    emit: (chunk: string) => emitData?.(chunk),
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}
