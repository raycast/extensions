import { afterEach, expect, spyOn, test } from "bun:test";
import { completeWithRecovery } from "../src/recovery";
import { models } from "./fixtures/models";

let transport: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;
afterEach(() => transport?.mockRestore());
const request = { messages: [{ role: "user" as const, content: [{ type: "text" as const, text: "Explain" }] }] };

function response(content: string, finish: string | null = "stop", tool = false) {
  const events = [
    {
      choices: [
        {
          index: 0,
          delta: {
            content,
            ...(tool
              ? { tool_calls: [{ index: 0, id: "abc123456", function: { name: "lookup", arguments: '{"q":' } }] }
              : {}),
          },
          finish_reason: null,
        },
      ],
    },
    {
      choices: [{ index: 0, delta: {}, finish_reason: finish }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    },
  ];
  return new Response(
    events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + (finish ? "data: [DONE]\n\n" : ""),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

async function collect(result: ReturnType<typeof completeWithRecovery>) {
  const parts = [];
  for await (const part of result.fullStream) parts.push(part);
  return parts;
}

test("continues an interrupted text answer without replaying its prefix", async () => {
  transport = spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(response("First ", null))
    .mockResolvedValueOnce(response("second."));
  const parts = await collect(completeWithRecovery(models[0], request, "test-key"));
  expect(
    parts
      .filter((part) => part.type === "text-delta")
      .map((part) => part.text)
      .join(""),
  ).toBe("First second.");
  expect(parts.filter((part) => part.type === "finish")).toEqual([
    expect.objectContaining({
      finishReason: "stop",
      totalUsage: expect.objectContaining({ inputTokens: 20, outputTokens: 10 }),
    }),
  ]);
  expect(parts.some((part) => part.type === "error")).toBe(false);
  expect(transport).toHaveBeenCalledTimes(2);
  const body = JSON.parse(String(transport.mock.calls[1][1]?.body));
  expect(body.messages.at(-2)).toMatchObject({ role: "assistant", content: "First " });
  expect(body.messages.at(-1).content[0].text).toContain("without repeating");
});

test("limits incomplete-stream continuations to two", async () => {
  transport = spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Unexpected additional request"))
    .mockResolvedValueOnce(response("partial ", null))
    .mockResolvedValueOnce(response("partial ", null))
    .mockResolvedValueOnce(response("partial ", null));
  const parts = await collect(completeWithRecovery(models[0], request, "test-key"));
  expect(transport).toHaveBeenCalledTimes(3);
  expect(parts.some((part) => part.type === "error")).toBe(true);
});

test("never continues after partial tool arguments have streamed", async () => {
  transport = spyOn(globalThis, "fetch").mockResolvedValueOnce(response("Looking up", null, true));
  const parts = await collect(
    completeWithRecovery(
      models[0],
      { ...request, tools: { lookup: { inputSchema: { type: "object", properties: { q: { type: "string" } } } } } },
      "test-key",
    ),
  );
  expect(transport).toHaveBeenCalledTimes(1);
  expect(parts.some((part) => part.type === "error")).toBe(true);
});

test.each(["length", "stop"])("does not continue a %s ending with no answer", async (finish) => {
  transport = spyOn(globalThis, "fetch").mockResolvedValueOnce(response("", finish));
  const parts = await collect(completeWithRecovery(models[0], request, "test-key"));
  expect(transport).toHaveBeenCalledTimes(1);
  expect(parts.some((part) => part.type === "error")).toBe(true);
});

test("retries transient HTTP failures before output using Retry-After", async () => {
  transport = spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(new Response("unavailable", { status: 503, headers: { "Retry-After": "0" } }))
    .mockResolvedValueOnce(response("Recovered"));
  const parts = await collect(completeWithRecovery(models[0], request, "test-key"));
  expect(transport).toHaveBeenCalledTimes(2);
  expect(parts.some((part) => part.type === "text-delta" && part.text === "Recovered")).toBe(true);
  expect(parts.some((part) => part.type === "error")).toBe(false);
});

test("does not retry invalid credentials", async () => {
  transport = spyOn(globalThis, "fetch").mockResolvedValueOnce(
    Response.json({ message: "Invalid API key" }, { status: 401 }),
  );
  const parts = await collect(completeWithRecovery(models[0], request, "test-key"));
  expect(transport).toHaveBeenCalledTimes(1);
  expect(parts.some((part) => part.type === "error")).toBe(true);
});

test("bounds transient HTTP retries to two before reporting failure", async () => {
  const unavailable = () => new Response("unavailable", { status: 503, headers: { "Retry-After": "0" } });
  transport = spyOn(globalThis, "fetch")
    .mockRejectedValue(new Error("Unexpected additional request"))
    .mockResolvedValueOnce(unavailable())
    .mockResolvedValueOnce(unavailable())
    .mockResolvedValueOnce(unavailable());
  const parts = await collect(completeWithRecovery(models[0], request, "test-key"));
  expect(transport).toHaveBeenCalledTimes(3);
  expect(parts.some((part) => part.type === "error")).toBe(true);
});

test("does not hide an empty continuation behind previously streamed text", async () => {
  transport = spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(response("Partial", null))
    .mockResolvedValueOnce(response(""));
  const parts = await collect(completeWithRecovery(models[0], request, "test-key"));
  expect(transport).toHaveBeenCalledTimes(2);
  expect(parts.some((part) => part.type === "error")).toBe(true);
});

test("replays reasoning and partial answer in continuation history", async () => {
  const event = {
    choices: [
      {
        index: 0,
        delta: {
          content: [
            { type: "thinking", thinking: [{ type: "text", text: "Plan" }] },
            { type: "text", text: "Partial" },
          ],
        },
        finish_reason: null,
      },
    ],
  };
  transport = spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      new Response(`data: ${JSON.stringify(event)}\n\n`, { headers: { "Content-Type": "text/event-stream" } }),
    )
    .mockResolvedValueOnce(response(" completed"));
  await collect(completeWithRecovery(models[0], request, "test-key"));
  const body = JSON.parse(String(transport.mock.calls[1][1]?.body));
  expect(body.messages.at(-2).content).toEqual([
    { type: "thinking", thinking: [{ type: "text", text: "Plan" }], closed: true },
    { type: "text", text: "Partial" },
  ]);
});

test("cancelling the Raycast stream aborts the request without continuing", async () => {
  let upstream: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      upstream = controller;
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: "Partial" }, finish_reason: null }] })}\n\n`,
        ),
      );
    },
  });
  transport = spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(body, { headers: { "Content-Type": "text/event-stream" } }),
  );
  const reader = completeWithRecovery(models[0], request, "test-key").fullStream.getReader();
  while (true) {
    const part = await reader.read();
    if (part.done || part.value.type === "text-delta") break;
  }
  const signal = transport.mock.calls[0][1]?.signal;
  signal?.addEventListener("abort", () => upstream.error(signal.reason), { once: true });
  await reader.cancel();
  expect(signal?.aborted).toBe(true);
  expect(transport).toHaveBeenCalledTimes(1);
});

test("an expired operation deadline reports an error instead of silently ending", async () => {
  transport = spyOn(globalThis, "fetch").mockRejectedValue(new Error("Must not request after deadline"));
  const timeout = spyOn(AbortSignal, "timeout").mockReturnValue(
    AbortSignal.abort(new DOMException("Response timed out", "TimeoutError")),
  );
  try {
    const parts = await collect(completeWithRecovery(models[0], request, "test-key"));
    expect(parts.some((part) => part.type === "error")).toBe(true);
    expect(transport).not.toHaveBeenCalled();
  } finally {
    timeout.mockRestore();
  }
});

test.each(["content_filter", "error", "unknown_provider_stop"])(
  "does not reinterpret explicit %s as a missing finish reason",
  async (reason) => {
    transport = spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("Must not continue explicit provider stops"))
      .mockResolvedValueOnce(response("Partial", reason));
    await collect(completeWithRecovery(models[0], request, "test-key"));
    expect(transport).toHaveBeenCalledTimes(1);
  },
);
