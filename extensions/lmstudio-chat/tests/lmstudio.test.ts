import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ baseUrl: "http://localhost:1234" }),
}));

import {
  chatStream,
  extractDelta,
  isConnectionError,
  listAllModels,
  listLoadedModels,
  LMStudioError,
  loadModel,
  splitSSEEvents,
  unloadModel,
} from "../src/lib/lmstudio";

const config = { baseUrl: "http://localhost:1234" };

afterEach(() => vi.unstubAllGlobals());

describe("splitSSEEvents", () => {
  it("splits complete events and keeps the incomplete tail", () => {
    const { events, rest } = splitSSEEvents("data: a\n\ndata: b\n\ndata: incompl");
    expect(events).toEqual(["data: a", "data: b"]);
    expect(rest).toBe("data: incompl");
  });

  it("returns everything as rest when no complete event", () => {
    const { events, rest } = splitSSEEvents("data: partial");
    expect(events).toEqual([]);
    expect(rest).toBe("data: partial");
  });
});

describe("extractDelta", () => {
  it("extracts delta content from a chat completion chunk", () => {
    const chunk = JSON.stringify({ choices: [{ delta: { content: "Hi" } }] });
    expect(extractDelta(`data: ${chunk}`)).toBe("Hi");
  });

  it("returns null for [DONE]", () => {
    expect(extractDelta("data: [DONE]")).toBeNull();
  });

  it("returns null for chunks without content (e.g. role-only delta)", () => {
    const chunk = JSON.stringify({ choices: [{ delta: { role: "assistant" } }] });
    expect(extractDelta(`data: ${chunk}`)).toBeNull();
  });

  it("returns null for non-data lines and malformed JSON", () => {
    expect(extractDelta(": keep-alive comment")).toBeNull();
    expect(extractDelta("data: {broken")).toBeNull();
  });
});

function sseResponse(body: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(body));
      controller.close();
    },
  });
  return new Response(stream, { status: 200 });
}

describe("chatStream", () => {
  it("yields deltas from an SSE stream", async () => {
    const body =
      `data: ${JSON.stringify({ choices: [{ delta: { role: "assistant" } }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: { content: "Hel" } }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: { content: "lo" } }] })}\n\n` +
      `data: [DONE]\n\n`;
    vi.stubGlobal("fetch", vi.fn(async () => sseResponse(body)));

    const parts: string[] = [];
    for await (const d of chatStream(config, { model: "m", messages: [], temperature: 0.7 })) {
      parts.push(d);
    }
    expect(parts).toEqual(["Hel", "lo"]);
  });

  it("throws LMStudioError with status on HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("model not found", { status: 404 })));
    const iterate = async () => {
      for await (const _ of chatStream(config, { model: "m", messages: [], temperature: 0.7 })) {
        // drain
      }
    };
    await expect(iterate()).rejects.toThrowError(LMStudioError);
    await expect(iterate()).rejects.toMatchObject({ status: 404 });
  });

  it("sends model, messages, temperature and stream:true in the request body", async () => {
    const fetchMock = vi.fn(async () => sseResponse("data: [DONE]\n\n"));
    vi.stubGlobal("fetch", fetchMock);
    const messages = [{ role: "user" as const, content: "hi" }];
    for await (const _ of chatStream(config, { model: "my-model", messages, temperature: 0.5 })) {
      // drain
    }
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:1234/v1/chat/completions");
    expect(JSON.parse(init.body as string)).toEqual({
      model: "my-model",
      messages,
      temperature: 0.5,
      stream: true,
    });
  });

  it("reassembles a delta split across multiple stream reads", async () => {
    const chunk1 = 'data: {"choices":[{"delta":{"con';
    const chunk2 = 'tent":"Hello"}}]}\n\n' + "data: [DONE]\n\n";
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(chunk1));
        controller.enqueue(new TextEncoder().encode(chunk2));
        controller.close();
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(stream, { status: 200 })),
    );

    const parts: string[] = [];
    for await (const d of chatStream(config, { model: "m", messages: [], temperature: 0.7 })) {
      parts.push(d);
    }
    expect(parts.join("")).toBe("Hello");
  });

  it("forwards the AbortSignal to fetch", async () => {
    const fetchMock = vi.fn(async () => sseResponse("data: [DONE]\n\n"));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    for await (const _ of chatStream(config, {
      model: "m",
      messages: [],
      temperature: 0.7,
      signal: controller.signal,
    })) {
      // drain
    }

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });
});

describe("model endpoints", () => {
  it("listLoadedModels returns ids from /v1/models", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ data: [{ id: "llama-3.2-3b" }, { id: "qwen2.5-7b" }] }), { status: 200 }),
      ),
    );
    expect(await listLoadedModels(config)).toEqual(["llama-3.2-3b", "qwen2.5-7b"]);
  });

  it("listAllModels maps native API entries (loaded_instances) to ModelInfo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            models: [
              {
                key: "google/gemma-4-e4b",
                display_name: "Gemma 4 E4B",
                type: "llm",
                loaded_instances: [
                  { id: "google/gemma-4-e4b", config: {}, remaining_ttl_seconds: 300 },
                  { id: "google/gemma-4-e4b:2", config: {} },
                ],
              },
              {
                key: "nomic-embed-text",
                display_name: "Nomic Embed Text",
                type: "embedding",
                loaded_instances: [],
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );
    expect(await listAllModels(config)).toEqual([
      {
        id: "google/gemma-4-e4b",
        loaded: true,
        instanceIds: ["google/gemma-4-e4b", "google/gemma-4-e4b:2"],
        kind: "llm",
        vision: false,
      },
      {
        id: "nomic-embed-text",
        loaded: false,
        instanceIds: [],
        kind: "embedding",
        vision: false,
      },
    ]);
  });

  it("loadModel POSTs the model key and adds bearer token when configured", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await loadModel({ baseUrl: "http://localhost:1234", apiToken: "secret" }, "google/gemma-4-e4b");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:1234/api/v1/models/load");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer secret");
    expect(JSON.parse(init.body as string)).toEqual({ model: "google/gemma-4-e4b" });
  });

  it("unloadModel POSTs the instance_id (not the model key)", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await unloadModel(config, "google/gemma-4-e4b:2");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:1234/api/v1/models/unload");
    expect(JSON.parse(init.body as string)).toEqual({ instance_id: "google/gemma-4-e4b:2" });
  });

  it("throws LMStudioError on non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    await expect(listLoadedModels(config)).rejects.toThrowError(LMStudioError);
  });
});

describe("listAllModels vision parsing", () => {
  it("parses kind and vision from native entries", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            models: [
              {
                key: "google/gemma-4-e4b",
                type: "llm",
                loaded_instances: [{ id: "google/gemma-4-e4b" }],
                capabilities: { vision: true, trained_for_tool_use: true },
              },
              {
                key: "text-embedding-nomic-embed-text-v1.5",
                type: "embedding",
                loaded_instances: [],
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const models = await listAllModels({ baseUrl: "http://x" });
    expect(models).toEqual([
      {
        id: "google/gemma-4-e4b",
        loaded: true,
        instanceIds: ["google/gemma-4-e4b"],
        kind: "llm",
        vision: true,
      },
      {
        id: "text-embedding-nomic-embed-text-v1.5",
        loaded: false,
        instanceIds: [],
        kind: "embedding",
        vision: false,
      },
    ]);
  });
});

describe("isConnectionError", () => {
  it("is true for fetch network failures and false for LMStudioError", () => {
    expect(isConnectionError(new TypeError("fetch failed"))).toBe(true);
    expect(isConnectionError(new LMStudioError("bad request", 400))).toBe(false);
  });
});
