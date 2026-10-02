import { describe, expect, it, vi } from "vitest";

import { TranslationType } from "@/core/results/kinds";
import { resolveAIProviderRuntimeConfig } from "@/providers/profiles/runtime";
import type { RaycastAIProfile } from "@/providers/profiles/types";
import { CancelledError } from "@/shared/errors";

import { createAITranslationProvider } from "./index";

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
  getPreferenceValues: () => ({}),
}));

vi.mock("@/shared/logger", () => ({
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
  it("yields data events and prefers the final completion when it differs from the chunks", async () => {
    const stream = createAIAnswer();
    testDoubles.ask.mockReturnValueOnce(stream.answer);
    const iterator = createProvider().request({
      word: "hello",
      fromLanguage: "en",
      toLanguage: "zh-CHS",
    });

    const first = iterator.next();
    stream.emit("你");
    await expect(first).resolves.toEqual({ done: false, value: { content: "你" } });

    const second = iterator.next();
    stream.emit("好");
    await expect(second).resolves.toEqual({ done: false, value: { content: "好" } });

    const completion = iterator.next();
    stream.resolve("最终译文");
    const result = await completion;
    expect(result.done).toBe(true);
    expect(result.value).toMatchObject({
      content: { kind: "translation", paragraphs: ["最终译文"] },
    });
  });

  it("uses the final completion when no data event is emitted", async () => {
    const stream = createAIAnswer();
    testDoubles.ask.mockReturnValueOnce(stream.answer);
    const iterator = createProvider().request({
      word: "hello",
      fromLanguage: "en",
      toLanguage: "zh-CHS",
    });

    const completion = iterator.next();
    stream.resolve("你好");
    await expect(completion).resolves.toMatchObject({
      done: true,
      value: { content: { paragraphs: ["你好"] } },
    });
  });

  it("settles an aborted request as normal cancellation", async () => {
    const stream = createAIAnswer();
    testDoubles.ask.mockReturnValueOnce(stream.answer);
    const abortController = new AbortController();
    const iterator = createProvider().request(
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
    const iterator = createProvider().request({
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

function createProvider() {
  const result = resolveAIProviderRuntimeConfig(profile);
  if (result.kind === "issue") throw new Error(result.message);
  return createAITranslationProvider(result.config);
}
