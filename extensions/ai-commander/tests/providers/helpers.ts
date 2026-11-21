import { readFileSync } from "node:fs";
import path from "node:path";
import { vi } from "vitest";
import type { ChatRequest, StreamEvent } from "../../src/core/types";

export function fixture(name: string): string {
  return readFileSync(path.join(__dirname, "fixtures", name), "utf8");
}

export function jsonFixture(name: string): unknown {
  return JSON.parse(fixture(name));
}

export function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Splits text into `size`-byte chunks, cutting through multibyte characters on purpose. */
export function chunked(text: string, size: number): Uint8Array[] {
  const all = bytes(text);
  const parts: Uint8Array[] = [];
  for (let i = 0; i < all.length; i += size) parts.push(all.slice(i, i + size));
  return parts;
}

export async function* iterate(chunks: Iterable<Uint8Array>): AsyncGenerator<Uint8Array> {
  yield* chunks;
}

export function sseResponse(text: string, chunkSize = 37): Response {
  const parts = chunked(text, chunkSize);
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = parts.shift();
      if (next === undefined) controller.close();
      else controller.enqueue(next);
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

export function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
}

/** Like real fetch, this rejects when the signal aborts, and aborting errors a body that is still open. */
export function hangingFetch(firstChunk?: string): typeof fetch {
  return (_url, init) =>
    new Promise<Response>((resolve, reject) => {
      const signal = init?.signal ?? undefined;
      const abortError = () => new DOMException("This operation was aborted", "AbortError");
      if (firstChunk === undefined) {
        signal?.addEventListener("abort", () => reject(abortError()));
        return;
      }
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes(firstChunk));
          signal?.addEventListener("abort", () => controller.error(abortError()));
        },
      });
      resolve(new Response(body, { headers: { "content-type": "text/event-stream" } }));
    });
}

export interface RecordedCall {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown> | undefined;
  method: string;
  redirect: RequestInit["redirect"];
}

/** Replaces global fetch with one that answers from a queue and records what was sent. */
export function stubFetch(...responses: Response[]): RecordedCall[] {
  const calls: RecordedCall[] = [];
  vi.stubGlobal("fetch", async (url: string | URL, init?: RequestInit) => {
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;
    calls.push({
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body,
      method: init?.method ?? "GET",
      redirect: init?.redirect,
    });
    const response = responses.shift();
    if (response === undefined) throw new Error("Unexpected fetch call");
    return response;
  });
  return calls;
}

export function chatRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    model: "test-model",
    system: "Return only the result.",
    user: "Please rewrite this confidential paragraph about the merger.",
    reasoning: "default",
    signal: new AbortController().signal,
    ...overrides,
  };
}

export async function collect(events: AsyncIterable<StreamEvent>): Promise<StreamEvent[]> {
  const result: StreamEvent[] = [];
  for await (const event of events) result.push(event);
  return result;
}

export function textOf(events: readonly StreamEvent[]): string {
  return events.map((event) => (event.type === "text" ? event.text : "")).join("");
}

/** Consumes a stream that should fail and returns the events before the failure with the error. */
export async function collectUntilError(events: AsyncIterable<StreamEvent>): Promise<{
  seen: StreamEvent[];
  error: unknown;
}> {
  const seen: StreamEvent[] = [];
  try {
    for await (const event of events) seen.push(event);
  } catch (error) {
    return { seen, error };
  }
  throw new Error("Expected the stream to fail");
}
