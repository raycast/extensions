import type { ChatCompletion, ChatCompletionChunk } from "openai/resources";
import OpenAI from "openai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { consumeCompletion } from "../src/hook/stream-completion";

function stream(parts: AsyncIterable<string>): AsyncIterable<ChatCompletionChunk> {
  return {
    async *[Symbol.asyncIterator]() {
      for await (const content of parts) {
        yield {
          id: "test",
          created: 0,
          model: "qwen/qwen3.8-27b",
          object: "chat.completion.chunk",
          choices: [{ index: 0, finish_reason: null, delta: { content } }],
        };
      }
    },
  };
}

async function* chunks(parts: string[]) {
  yield* parts;
}

afterEach(() => vi.useRealTimers());

describe("completion view updates", () => {
  it("consumes a real SDK stream with role, content, finish, and usage-only chunks", async () => {
    vi.useFakeTimers();
    const parts = [
      { choices: [{ delta: { role: "assistant" } }] },
      ...Array.from({ length: 2000 }, () => ({ choices: [{ delta: { content: "word " } }] })),
      { choices: [{ delta: {}, finish_reason: "stop" }] },
      { choices: [], usage: { prompt_tokens: 4, completion_tokens: 2000 } },
    ];
    const body = parts.map((part) => `data: ${JSON.stringify(part)}\n\n`).join("") + "data: [DONE]\n\n";
    const client = new OpenAI({
      apiKey: "test-key",
      fetch: async () => new Response(body, { headers: { "Content-Type": "text/event-stream" } }),
    });
    const response = await client.chat.completions.create({ model: "qwen/qwen3.8-27b", messages: [], stream: true });
    const update = vi.fn();
    await consumeCompletion(response, { onUpdate: update });
    expect(update).toHaveBeenCalledExactlyOnceWith("word ".repeat(2000), "word ".repeat(2000));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("coalesces a rapid stream and flushes the complete answer without waiting for a timer", async () => {
    vi.useFakeTimers();
    const parts = Array.from({ length: 2000 }, (_, i) => `word${i} `);
    const update = vi.fn();
    await consumeCompletion(stream(chunks(parts)), { onUpdate: update });
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenLastCalledWith(parts.join(""), parts.join(""));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shows progress at 100 ms intervals and flushes the trailing text on completion", async () => {
    vi.useFakeTimers();
    const update = vi.fn();
    async function* paced() {
      for (let i = 0; i < 25; i++) {
        yield "x";
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }
    const result = consumeCompletion(stream(paced()), { onUpdate: update });
    await vi.advanceTimersByTimeAsync(99);
    expect(update).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(update).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(150);
    await result;
    expect(update).toHaveBeenCalledTimes(3);
    expect(update).toHaveBeenLastCalledWith("x".repeat(25), "x".repeat(25));
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(Array.from({ length: 7 }, (_, i) => i + 1))(
    "handles a closing thinking tag split at offset %i",
    async (offset) => {
      const update = vi.fn();
      const tag = "</think>";
      const parts = ["<think>reasoning", tag.slice(0, offset), tag.slice(offset), "Final ", "answer"];
      await consumeCompletion(stream(chunks(parts)), { onUpdate: update, thinking: true });
      expect(update).toHaveBeenLastCalledWith("Final answer", parts.join(""));
    },
  );

  it("flushes partial output and releases the timer when a stream fails", async () => {
    vi.useFakeTimers();
    const update = vi.fn();
    async function* interrupted() {
      yield "Partial answer";
      throw new Error("Connection lost");
    }
    await expect(consumeCompletion(stream(interrupted()), { onUpdate: update })).rejects.toThrow("Connection lost");
    expect(update).toHaveBeenLastCalledWith("Partial answer", "Partial answer");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("cancels pending updates immediately and ignores chunks from an aborted request", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const update = vi.fn();
    async function* interrupted() {
      yield "Old answer";
      controller.abort();
      expect(vi.getTimerCount()).toBe(0);
      yield "Late answer";
    }
    await consumeCompletion(stream(interrupted()), { onUpdate: update, signal: controller.signal });
    await vi.runAllTimersAsync();
    expect(update).not.toHaveBeenCalled();
  });

  it("uses the same output formatting for a non-streaming completion", async () => {
    const update = vi.fn();
    const response = { choices: [{ message: { content: "<think>reasoning</think>Answer" } }] } as ChatCompletion;
    await consumeCompletion(response, { onUpdate: update, thinking: true });
    expect(update).toHaveBeenCalledExactlyOnceWith("Answer", "<think>reasoning</think>Answer");
  });
});
