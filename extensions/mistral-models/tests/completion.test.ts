import { afterEach, expect, spyOn, test } from "bun:test";
import type { AI } from "@raycast/api";
import { models } from "./fixtures/models";
import { complete } from "../src/completion";

let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;
afterEach(() => fetchSpy?.mockRestore());

function streamResponse(deltas: object[], finishReason = "stop") {
  const events = [
    ...deltas.map((delta) => ({ choices: [{ index: 0, delta, finish_reason: null }] })),
    {
      choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    },
  ];
  return new Response(events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("") + "data: [DONE]\n\n", {
    headers: { "Content-Type": "text/event-stream" },
  });
}

function mockResponse(response: Response) {
  fetchSpy = spyOn(globalThis, "fetch").mockResolvedValue(response);
  return fetchSpy;
}

const prompt: AI.ModelRequest = {
  system: "Be concise.",
  messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
};

test("streams text and maps Raycast reasoning settings into the Mistral request", async () => {
  const transport = mockResponse(streamResponse([{ content: "Bon" }, { content: "jour" }]));
  const result = complete(
    models[0],
    { ...prompt, temperature: 0.2, providerOptions: { raycast: { reasoningEffort: "none" } } },
    " test-key ",
  );
  expect(await result.text).toBe("Bonjour");
  const [url, init] = transport.mock.calls[0];
  expect(String(url)).toBe("https://api.mistral.ai/v1/chat/completions");
  expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-key");
  const body = JSON.parse(String(init?.body));
  expect(body).toMatchObject({ model: "mistral-medium-3-5", stream: true, temperature: 0.2, reasoning_effort: "none" });
  expect(body.messages[0]).toEqual({ role: "system", content: "Be concise." });
});

test("forwards tool schemas and emits complete tool calls for Raycast to execute", async () => {
  const transport = mockResponse(
    streamResponse(
      [
        { tool_calls: [{ index: 0, id: "abc123456", function: { name: "weather", arguments: '{"city":' } }] },
        { tool_calls: [{ index: 0, function: { arguments: '"Madrid"}' } }] },
      ],
      "tool_calls",
    ),
  );
  const result = complete(
    models[1],
    {
      ...prompt,
      tools: {
        weather: {
          description: "Get the weather",
          inputSchema: { type: "object", properties: { city: { type: "string" } }, required: ["city"] },
        },
      },
      toolChoice: "required",
    },
    "test-key",
  );
  const parts = [];
  for await (const part of result.fullStream) parts.push(part);
  expect(parts).toContainEqual(
    expect.objectContaining({
      type: "tool-call",
      toolCallId: "abc123456",
      toolName: "weather",
      input: { city: "Madrid" },
    }),
  );
  const body = JSON.parse(String(transport.mock.calls[0][1]?.body));
  expect(body.tools[0].function.parameters.required).toEqual(["city"]);
  expect(body.tool_choice).toBe("any");
  expect(parts.some((part) => part.type === "error")).toBe(false);
  expect(parts).toContainEqual(expect.objectContaining({ type: "finish", finishReason: "tool-calls" }));
  expect(transport).toHaveBeenCalledTimes(1);
});

test("preserves tool results and image attachments in follow-up requests", async () => {
  const transport = mockResponse(streamResponse([{ content: "Sunny" }]));
  await complete(
    models[0],
    {
      messages: [
        { role: "user", content: [{ type: "file", mediaType: "image/png", data: "aGVsbG8=" }] },
        {
          role: "assistant",
          content: [{ type: "tool-call", toolCallId: "abc123456", toolName: "weather", input: {} }],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "abc123456",
              toolName: "weather",
              output: { type: "json", value: { sunny: true } },
            },
          ],
        },
      ],
    },
    "test-key",
  ).text;
  const body = JSON.parse(String(transport.mock.calls[0][1]?.body));
  expect(body.messages[0].content[0]).toEqual({ type: "image_url", image_url: "data:image/png;base64,aGVsbG8=" });
  expect(body.messages[2]).toMatchObject({ role: "tool", tool_call_id: "abc123456", content: '{"sunny":true}' });
});

test("streams Mistral thinking chunks as reasoning, separate from the answer", async () => {
  mockResponse(
    streamResponse([
      { content: [{ type: "thinking", thinking: [{ type: "text", text: "Consider the question." }] }] },
      { content: "Answer" },
    ]),
  );
  const result = complete(models[2], prompt, "test-key");
  const parts = [];
  for await (const part of result.fullStream) parts.push(part);
  expect(parts).toContainEqual(expect.objectContaining({ type: "reasoning-delta", text: "Consider the question." }));
  expect(parts).toContainEqual(expect.objectContaining({ type: "text-delta", text: "Answer" }));
});

test("surfaces API errors without retries", async () => {
  const transport = mockResponse(new Response(JSON.stringify({ message: "Invalid API key" }), { status: 401 }));
  const result = complete(models[0], prompt, "test-key");
  const parts = [];
  for await (const part of result.fullStream) parts.push(part);
  expect(parts.some((part) => part.type === "error")).toBe(true);
  expect(transport).toHaveBeenCalledTimes(1);
});

test("rejects missing keys and unsupported reasoning choices before sending requests", () => {
  const transport = mockResponse(streamResponse([]));
  expect(() => complete(models[0], prompt, " ")).toThrow("Mistral API key");
  expect(() =>
    complete(models[0], { ...prompt, providerOptions: { raycast: { reasoningEffort: "invalid" } } }, "test-key"),
  ).toThrow("Unsupported reasoning effort");
  expect(transport).not.toHaveBeenCalled();
});

test("omits temperature when the selected model does not support it", async () => {
  const transport = mockResponse(streamResponse([{ content: "Hello" }]));
  await complete(
    { ...models[0], capabilities: { temperature: { supported: false } } },
    { ...prompt, temperature: 0.7 },
    "test-key",
  ).text;
  expect(JSON.parse(String(transport.mock.calls[0][1]?.body)).temperature).toBeUndefined();
});

test("preserves Unicode text and usage across fragmented network chunks", async () => {
  const bytes = new Uint8Array(await streamResponse([{ content: "¡Hola! 👋" }]).arrayBuffer());
  mockResponse(
    new Response(
      new ReadableStream({
        start(controller) {
          for (let index = 0; index < bytes.length; index += 3) controller.enqueue(bytes.slice(index, index + 3));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    ),
  );
  const result = complete(models[0], prompt, "test-key");
  const parts = [];
  for await (const part of result.fullStream) parts.push(part);
  expect(
    parts
      .filter((part) => part.type === "text-delta")
      .map((part) => part.text)
      .join(""),
  ).toBe("¡Hola! 👋");
  expect(parts).toContainEqual(
    expect.objectContaining({
      type: "finish",
      totalUsage: expect.objectContaining({ inputTokens: 10, outputTokens: 5 }),
    }),
  );
});

async function streamErrors(response: Response) {
  const transport = mockResponse(response);
  const errors: string[] = [];
  try {
    for await (const part of complete(models[0], prompt, "test-key").fullStream) {
      if (part.type === "error") errors.push(String(part.error));
    }
  } catch (error) {
    errors.push(String(error));
  }
  expect(transport).toHaveBeenCalledTimes(1);
  return errors.join("\n");
}

test("accepts usage-only final events without losing the answer or usage", async () => {
  const events = [
    { choices: [{ index: 0, delta: { content: "Bonjour 👋" }, finish_reason: null }] },
    { choices: [{ index: 0, delta: {}, finish_reason: "stop" }] },
    { choices: [], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } },
  ];
  const bytes = new TextEncoder().encode(
    events.map((event) => `data: ${JSON.stringify(event)}\r\n\r\n`).join("") + "data: [DONE]\r\n\r\n",
  );
  mockResponse(
    new Response(
      new ReadableStream({
        start(controller) {
          for (let index = 0; index < bytes.length; index += 3) controller.enqueue(bytes.slice(index, index + 3));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/event-stream" } },
    ),
  );
  const result = complete(models[0], prompt, "test-key");
  expect(await result.text).toBe("Bonjour 👋");
  expect(await result.totalUsage).toMatchObject({ inputTokens: 10, outputTokens: 5 });
});

test("reports EOF without a finish reason instead of silently ending", async () => {
  const event = { choices: [{ index: 0, delta: { content: "Partial answer" }, finish_reason: null }] };
  expect(
    await streamErrors(
      new Response(`data: ${JSON.stringify(event)}\n\n`, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    ),
  ).toContain("interrupted");
});

test("reports a token limit reached during reasoning instead of an empty answer", async () => {
  expect(
    await streamErrors(
      streamResponse([{ content: [{ type: "thinking", thinking: [{ type: "text", text: "Thinking" }] }] }], "length"),
    ),
  ).toContain("token limit");
});

test("reports a reasoning-only stop without treating it as a final answer", async () => {
  expect(
    await streamErrors(
      streamResponse([{ content: [{ type: "thinking", thinking: [{ type: "text", text: "Thinking" }] }] }]),
    ),
  ).toContain("without an answer");
});

test("a DONE marker alone cannot turn an unfinished answer into a success", async () => {
  const event = { choices: [{ index: 0, delta: { content: "Partial" }, finish_reason: null }] };
  expect(
    await streamErrors(
      new Response(`data: ${JSON.stringify(event)}\n\ndata: [DONE]\n\n`, {
        headers: { "Content-Type": "text/event-stream" },
      }),
    ),
  ).toContain("interrupted");
});

test("reports model_length truncation even after visible answer text", async () => {
  expect(await streamErrors(streamResponse([{ content: "Unfinished answer" }], "model_length"))).toContain(
    "token limit",
  );
});

test("preserves the first answer text in a mixed thinking-to-text event", async () => {
  mockResponse(
    streamResponse([
      {
        content: [
          { type: "thinking", thinking: [{ type: "text", text: "Thinking" }] },
          { type: "text", text: "Answer" },
        ],
      },
      { content: " complete" },
    ]),
  );
  expect(await complete(models[0], prompt, "test-key").text).toBe("Answer complete");
});
