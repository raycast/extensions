import type { AI } from "@raycast/api";
import { describe, expect, it } from "vitest";
import { createModelProvider } from "../src/model-provider";

const model: AI.RegisteredModel = { id: "liquid.auto", title: "Liquid Auto" };
const request: AI.ModelRequest = {
  system: "Be concise.",
  messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
  providerOptions: { raycast: { sessionId: "private-conversation", locale: "en", currentDate: "2026-11-11" } },
};

function harness(response: () => Response) {
  const calls: Request[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    calls.push(new Request(input, init));
    return response();
  };
  return { calls, provider: createModelProvider({ apiKey: "test-key", fetch: fetcher }) };
}

function sse(deltas: Record<string, unknown>[] = [{ content: "Hello" }], finishReason = "stop") {
  const chunks = deltas.map((delta) => ({
    id: "chatcmpl-test",
    model: "liquid.auto",
    created: 1,
    choices: [{ index: 0, delta, finish_reason: null }],
  }));
  return new Response(
    [
      ...chunks,
      {
        id: "chatcmpl-test",
        model: "liquid.auto",
        created: 1,
        choices: [{ index: 0, delta: {}, finish_reason: finishReason }],
      },
    ]
      .map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`)
      .join("") + "data: [DONE]\n\n",
    {
      headers: { "Content-Type": "text/event-stream" },
    },
  );
}

async function collect(provider: ReturnType<typeof createModelProvider>, input = request) {
  const result = await provider.streamCompletion(model, input);
  if (!("fullStream" in result)) throw new Error("Expected a full stream");
  const parts: AI.ModelStreamPart[] = [];
  for await (const part of result.fullStream as AsyncIterable<AI.ModelStreamPart>) parts.push(part);
  return parts;
}

describe("model discovery", () => {
  it("lists chat routes and derives capabilities from the catalog", async () => {
    const { provider, calls } = harness(() =>
      Response.json({
        data: [
          {
            id: "liquid.auto",
            modality: "text",
            context_length: 128000,
            liquid_supported_parameters: ["tools", "input.image", "reasoning.effort"],
          },
          { id: "preset:work", modality: "text", liquid_supported_parameters: ["text"] },
          { id: "collection:chat", kind: "chat", liquid_supported_parameters: [] },
          { id: "image", modality: "image", kind: "image_generation", liquid_supported_parameters: ["text"] },
          { id: "embedding", kind: "embedding" },
          { id: "voice", modality: "speech" },
        ],
      }),
    );
    const models = await provider.getModels();
    expect(models.map((entry) => entry.id)).toEqual(["liquid.auto", "preset:work", "collection:chat"]);
    expect(models[0]).toMatchObject({
      contextWindow: 128000,
      capabilities: {
        tools: { supported: true },
        vision: { mediaTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"] },
      },
    });
    expect(models[1].capabilities?.tools?.supported).toBe(false);
    expect(models[1].capabilities?.vision).toBeUndefined();
    expect(models[1].contextWindow).toBeUndefined();
    expect(calls[0].url).toBe("https://router.inference.ai.exchange/v1/models?kind=text");
    expect(calls[0].headers.get("Authorization")).toBe("Bearer test-key");
  });

  it.each([401, 403, 429, 500])("reports discovery failure without response secrets: %i", async (status) => {
    const { provider } = harness(() => new Response("private upstream detail", { status }));
    await expect(provider.getModels()).rejects.toThrow(status === 401 || status === 403 ? /API key/ : /HTTP/);
    await expect(provider.getModels()).rejects.not.toThrow(/private upstream detail/);
  });

  it("rejects a malformed catalog", async () => {
    const { provider } = harness(() => Response.json({ data: [{ id: 3 }] }));
    await expect(provider.getModels()).rejects.toThrow();
  });
});

describe("completion", () => {
  it("sends chat requests and exposes text and reasoning stream parts", async () => {
    const { provider, calls } = harness(() => sse([{ reasoning_content: "Consider this." }, { content: "Hello" }]));
    const parts = await collect(provider);
    expect(parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "reasoning-delta", text: "Consider this." }),
        expect.objectContaining({ type: "text-delta", text: "Hello" }),
      ]),
    );
    expect(calls[0].url).toBe("https://router.inference.ai.exchange/v1/chat/completions");
    expect(calls[0].headers.get("Authorization")).toBe("Bearer test-key");
    expect(await calls[0].json()).toMatchObject({
      model: "liquid.auto",
      stream: true,
      messages: [
        { role: "system", content: "Be concise." },
        { role: "user", content: "Hello" },
      ],
    });
  });

  it("keeps session affinity stable without disclosing raw Raycast context", async () => {
    const { provider, calls } = harness(() => sse());
    await collect(provider);
    await collect(provider);
    await collect(provider, {
      ...request,
      providerOptions: { raycast: { ...request.providerOptions.raycast, sessionId: "another" } },
    });
    const session = calls[0].headers.get("x-session-id");
    expect(session).toMatch(/^raycast:[a-f0-9]{64}$/);
    expect(calls[1].headers.get("x-session-id")).toBe(session);
    expect(calls[2].headers.get("x-session-id")).not.toBe(session);
    const body = await calls[0].text();
    expect(body).not.toContain("private-conversation");
    expect(body).not.toContain("currentDate");
    expect(body).not.toContain("locale");
    let otherSession: string | null = null;
    const other = createModelProvider({
      apiKey: "another-key",
      fetch: async (input, init) => {
        otherSession = new Request(input, init).headers.get("x-session-id");
        return sse();
      },
    });
    await collect(other);
    expect(otherSession).not.toBe(session);
  });

  it("omits the affinity header when the session is empty", async () => {
    const { provider, calls } = harness(() => sse());
    await collect(provider, {
      ...request,
      providerOptions: { raycast: { ...request.providerOptions.raycast, sessionId: "" } },
    });
    expect(calls[0].headers.has("x-session-id")).toBe(false);
  });

  it("sends image attachments as OpenAI image parts", async () => {
    const { provider, calls } = harness(() => sse());
    await collect(provider, {
      ...request,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this" },
            { type: "file", data: "aGVsbG8=", mediaType: "image/png" },
          ],
        },
      ],
    });
    const body = await calls[0].json();
    expect(body.messages[1].content).toContainEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,aGVsbG8=" },
    });
  });

  it("sends tool schemas and returns tool calls for Raycast to execute", async () => {
    const { provider, calls } = harness(() =>
      sse(
        [
          {
            tool_calls: [
              { index: 0, id: "call_1", type: "function", function: { name: "weather", arguments: '{"city":' } },
            ],
          },
          { tool_calls: [{ index: 0, function: { arguments: '"Paris"}' } }] },
        ],
        "tool_calls",
      ),
    );
    const parts = await collect(provider, {
      ...request,
      tools: {
        weather: {
          description: "Get weather",
          inputSchema: { type: "object", properties: { city: { type: "string" } }, required: ["city"] },
        },
      },
      toolChoice: "required",
    });
    const body = await calls[0].json();
    expect(body.tool_choice).toBe("required");
    expect(body.tools[0].function.parameters.properties.city).toEqual({ type: "string" });
    expect(parts).toContainEqual(
      expect.objectContaining({
        type: "tool-call",
        toolCallId: "call_1",
        toolName: "weather",
        input: { city: "Paris" },
      }),
    );
    expect(calls).toHaveLength(1);
  });

  it("sends tool results with their original call IDs on the next turn", async () => {
    const { provider, calls } = harness(() => sse());
    await collect(provider, {
      ...request,
      messages: [
        ...(request.messages ?? []),
        {
          role: "assistant",
          content: [{ type: "tool-call", toolCallId: "call_1", toolName: "weather", input: { city: "Paris" } }],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call_1",
              toolName: "weather",
              output: { type: "json", value: { temperature: 18 } },
            },
          ],
        },
      ],
    });
    const body = await calls[0].json();
    expect(body.messages[2].tool_calls).toEqual([
      { id: "call_1", type: "function", function: { name: "weather", arguments: '{"city":"Paris"}' } },
    ]);
    expect(body.messages[3]).toEqual({ role: "tool", tool_call_id: "call_1", content: '{"temperature":18}' });
  });

  it("does not retry a failed paid request", async () => {
    const { provider, calls } = harness(() => Response.json({ error: { message: "Unavailable" } }, { status: 503 }));
    const parts = await collect(provider);
    expect(parts.some((part) => part.type === "error")).toBe(true);
    expect(calls).toHaveLength(1);
  });
});
