import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AI } from "@raycast/api";
import { APICallError } from "ai";
import {
  API_VERSION,
  AUTO_MODEL_ID,
  CACHE_TTL_MS,
  INTEGRATION_ID,
  USER_AGENT,
  createCopilotInferenceProvider,
  requestHeaders,
  toCopilotError,
  type CopilotModel,
  type KeyValueStorage,
} from "../src/services/inference-core.ts";

const createMemoryStorage = (): KeyValueStorage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return {
    map,
    getItem: async (key) => map.get(key),
    setItem: async (key, value) => {
      map.set(key, value);
    },
    removeItem: async (key) => {
      map.delete(key);
    },
    allKeys: async () => [...map.keys()],
  };
};

const jsonResponse = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

const sseResponse = (chunks: string[]): Response =>
  new Response(chunks.join(""), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });

const CATALOG: CopilotModel[] = [
  {
    id: "claude-sonnet-5.5",
    name: "Claude Sonnet 5.5",
    vendor: "Anthropic",
    model_picker_enabled: true,
    supported_endpoints: ["/v1/messages", "/chat/completions"],
    policy: { state: "enabled" },
    capabilities: {
      type: "chat",
      limits: {
        max_context_window_tokens: 200000,
        max_output_tokens: 64000,
        vision: { supported_media_types: ["image/png", "image/jpeg"] },
      },
      supports: {
        adaptive_thinking: true,
        reasoning_effort: ["low", "medium", "high"],
        streaming: true,
        tool_calls: true,
        vision: true,
      },
    },
  },
  {
    id: "gpt-6-sol",
    name: "GPT-6 Sol",
    vendor: "OpenAI",
    model_picker_enabled: true,
    supported_endpoints: ["/responses"],
    policy: { state: "enabled" },
    capabilities: {
      type: "chat",
      limits: {
        max_context_window_tokens: 128000,
        max_output_tokens: 32000,
        vision: { supported_media_types: ["image/png"] },
      },
      supports: {
        reasoning_effort: ["none", "low", "medium", "high"],
        streaming: true,
        tool_calls: true,
        vision: true,
      },
    },
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    vendor: "Google",
    model_picker_enabled: true,
    supported_endpoints: ["/chat/completions"],
    policy: { state: "enabled" },
    capabilities: {
      type: "chat",
      limits: {
        max_context_window_tokens: 1000000,
        max_output_tokens: 65536,
      },
      supports: {
        reasoning_effort: ["low", "medium", "high"],
        streaming: true,
        tool_calls: true,
        vision: false,
      },
    },
  },
  {
    id: "disabled-model",
    name: "Disabled Model",
    vendor: "Test",
    model_picker_enabled: true,
    supported_endpoints: ["/chat/completions"],
    policy: { state: "disabled" },
    capabilities: { type: "chat" },
  },
  {
    id: "text-embedding-3-small",
    name: "Embedding",
    vendor: "OpenAI",
    model_picker_enabled: true,
    supported_endpoints: null,
    capabilities: { type: "embeddings" },
  },
];

interface RecordedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

const createMockFetch = (
  handler: (req: RecordedRequest) => Response | Promise<Response>,
): { fetcher: typeof fetch; requests: RecordedRequest[] } => {
  const requests: RecordedRequest[] = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers: Record<string, string> = {};
    new Headers(init?.headers).forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    let body: unknown;
    if (typeof init?.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const recorded: RecordedRequest = {
      url,
      method: init?.method ?? "GET",
      headers,
      body,
    };
    requests.push(recorded);
    return handler(recorded);
  };
  return { fetcher, requests };
};

const baseRequest = (overrides: Partial<AI.ModelRequest> = {}): AI.ModelRequest =>
  ({
    system: "You are helpful.",
    messages: [{ role: "user", content: [{ type: "text", text: "Hi" }] }],
    providerOptions: {
      raycast: {
        sessionId: "sess-1",
        locale: "en-GB",
        currentDate: "2026-11-24",
      },
    },
    ...overrides,
  }) as AI.ModelRequest;

describe("requestHeaders", () => {
  it("handles string user message content without throwing", () => {
    const headers = requestHeaders({
      messages: [{ role: "user", content: "plain string prompt" }],
    } as unknown as AI.ModelRequest);
    assert.deepEqual(headers, { "X-Initiator": "user" });
  });

  it("sets Copilot-Vision-Request when an image file part is present and X-Initiator agent on tool results", () => {
    const headers = requestHeaders({
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Describe this" },
            { type: "file", data: "abc", mediaType: "image/png" },
          ],
        },
        { role: "tool", content: [] },
      ],
    } as unknown as AI.ModelRequest);
    assert.deepEqual(headers, {
      "X-Initiator": "agent",
      "Copilot-Vision-Request": "true",
    });
  });
});

describe("toCopilotError", () => {
  it("maps 403 plain-text Terms of Service responses to a non-retryable APICallError", async () => {
    const res = new Response("Access to this endpoint is forbidden. Please review our Terms of Service.", {
      status: 403,
      headers: { "content-type": "text/plain" },
    });
    const err = await toCopilotError(res, "https://api.individual.githubcopilot.com/v1/messages");
    assert.equal(APICallError.isInstance(err), true);
    assert.equal(err.statusCode, 403);
    assert.equal(err.isRetryable, false);
    assert.match(err.message, /HTTP 403/);
    assert.match(err.message, /Terms of Service/);
  });

  it("maps integrator and endpoint error codes and GitHub REST messages", async () => {
    const integratorErr = await toCopilotError(
      jsonResponse({ error: { code: "model_not_available_for_integrator", message: "blocked" } }, 400),
      "https://api.individual.githubcopilot.com/chat/completions",
    );
    assert.equal(integratorErr.isRetryable, false);
    assert.match(integratorErr.message, /Raycast integration/);

    const restErr = await toCopilotError(
      jsonResponse({ message: "Bad credentials" }, 401),
      "https://api.github.com/copilot_internal/user",
    );
    assert.equal(restErr.statusCode, 401);
    assert.equal(restErr.isRetryable, false);
    assert.match(restErr.message, /session has expired/);

    const rateLimitErr = await toCopilotError(
      jsonResponse({ error: { message: "slow down" } }, 429),
      "https://api.individual.githubcopilot.com/responses",
    );
    assert.equal(rateLimitErr.statusCode, 429);
    assert.equal(rateLimitErr.isRetryable, true);
  });
});

describe("getCopilotModels", () => {
  it("filters pickable chat models and synthesizes Auto from available_models", async () => {
    const storage = createMemoryStorage();
    const { fetcher, requests } = createMockFetch((req) => {
      if (req.url === "https://api.github.com/copilot_internal/user") {
        return jsonResponse({ endpoints: { api: "https://api.individual.githubcopilot.com" } });
      }
      if (req.url === "https://api.individual.githubcopilot.com/models") {
        return jsonResponse({ data: CATALOG });
      }
      if (req.url === "https://api.individual.githubcopilot.com/models/session") {
        return jsonResponse({
          session_token: "sess-tok",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          available_models: ["claude-sonnet-5.5", "gpt-6-sol"],
          selected_model: "gpt-6-sol",
        });
      }
      throw new Error(`Unexpected URL: ${req.url}`);
    });

    const provider = createCopilotInferenceProvider({
      authorize: async () => "gho_test_token",
      storage,
      modelIcon: "copilot.svg",
      fetch: fetcher,
    });

    const models = await provider.getCopilotModels();
    assert.deepEqual(
      models.map((m) => m.id),
      [AUTO_MODEL_ID, "claude-sonnet-5.5", "gpt-6-sol", "gemini-3.8-flash"],
    );

    const auto = models[0];
    assert.equal(auto.contextWindow, 128000);
    assert.deepEqual(auto.capabilities?.vision?.mediaTypes, ["image/png"]);

    assert.equal(requests[0].headers["accept"], "application/json");
    assert.equal(requests[0].headers["user-agent"], USER_AGENT);
    assert.equal(requests[1].headers["copilot-integration-id"], INTEGRATION_ID);
    assert.equal(requests[1].headers["x-github-api-version"], API_VERSION);
  });

  it("omits Auto when /models/session returns 403 or empty available_models", async () => {
    const storage = createMemoryStorage();
    const { fetcher } = createMockFetch((req) => {
      if (req.url.endsWith("/copilot_internal/user")) {
        return jsonResponse({ endpoints: { api: "https://api.individual.githubcopilot.com" } });
      }
      if (req.url.endsWith("/models")) {
        return jsonResponse({ data: CATALOG });
      }
      return jsonResponse({ error: { message: "Auto not available" } }, 403);
    });

    const provider = createCopilotInferenceProvider({
      authorize: async () => "gho_test_token",
      storage,
      modelIcon: "copilot.svg",
      fetch: fetcher,
    });

    const models = await provider.getCopilotModels();
    assert.deepEqual(
      models.map((m) => m.id),
      ["claude-sonnet-5.5", "gpt-6-sol", "gemini-3.8-flash"],
    );
  });
});

describe("streamCopilotCompletion routes", () => {
  it("streams /v1/messages with Anthropic adaptive thinking, effort, toolStreaming=false, and strips x-api-key", async () => {
    const storage = createMemoryStorage();
    const { fetcher, requests } = createMockFetch((req) => {
      if (req.url.endsWith("/copilot_internal/user")) {
        return jsonResponse({ endpoints: { api: "https://api.individual.githubcopilot.com" } });
      }
      if (req.url.endsWith("/models")) {
        return jsonResponse({ data: CATALOG });
      }
      if (req.url === "https://api.individual.githubcopilot.com/v1/messages") {
        return sseResponse([
          `event: message_start\ndata: ${JSON.stringify({
            type: "message_start",
            message: {
              id: "msg_1",
              type: "message",
              role: "assistant",
              model: "claude-sonnet-5.5",
              content: [],
              stop_reason: null,
              stop_sequence: null,
              usage: { input_tokens: 5, output_tokens: 1 },
            },
          })}\n\n`,
          `event: content_block_start\ndata: ${JSON.stringify({
            type: "content_block_start",
            index: 0,
            content_block: { type: "text", text: "" },
          })}\n\n`,
          `event: content_block_delta\ndata: ${JSON.stringify({
            type: "content_block_delta",
            index: 0,
            delta: { type: "text_delta", text: "Hello" },
          })}\n\n`,
          `event: content_block_stop\ndata: ${JSON.stringify({ type: "content_block_stop", index: 0 })}\n\n`,
          `event: message_delta\ndata: ${JSON.stringify({
            type: "message_delta",
            delta: { stop_reason: "end_turn", stop_sequence: null },
            usage: { output_tokens: 2 },
          })}\n\n`,
          `event: message_stop\ndata: ${JSON.stringify({ type: "message_stop" })}\n\n`,
        ]);
      }
      throw new Error(`Unexpected URL: ${req.url}`);
    });

    const provider = createCopilotInferenceProvider({
      authorize: async () => "gho_test_token",
      storage,
      modelIcon: "copilot.svg",
      fetch: fetcher,
    });

    const result = await provider.streamCopilotCompletion(
      { id: "claude-sonnet-5.5", title: "Claude Sonnet 5.5" },
      baseRequest({
        tools: {
          search: {
            description: "Search",
            inputSchema: { type: "object", properties: { q: { type: "string" } } },
          },
        },
        providerOptions: {
          raycast: {
            sessionId: "s1",
            locale: "en-GB",
            currentDate: "2026-11-24",
            reasoningEffort: "high",
          },
        },
      }),
    );

    let text = "";
    for await (const chunk of result.textStream) {
      text += chunk;
    }
    assert.equal(text, "Hello");

    const infReq = requests.find((r) => r.url === "https://api.individual.githubcopilot.com/v1/messages");
    assert.ok(infReq);
    assert.equal(infReq.headers["x-api-key"], undefined);
    assert.equal(infReq.headers["authorization"], "Bearer gho_test_token");
    assert.equal(infReq.headers["copilot-integration-id"], INTEGRATION_ID);
    assert.equal(infReq.headers["x-github-api-version"], API_VERSION);
    assert.equal(infReq.headers["x-initiator"], "user");

    const body = infReq.body as Record<string, unknown>;
    assert.equal(body.max_tokens, 64000);
    assert.deepEqual(body.thinking, { type: "adaptive" });
    assert.deepEqual(body.output_config, { effort: "high" });
    assert.equal((body.tools as Array<Record<string, unknown>>)[0].eager_input_streaming, undefined);
  });

  it("streams /responses with store=false, reasoning effort, and output limit", async () => {
    const storage = createMemoryStorage();
    const { fetcher, requests } = createMockFetch((req) => {
      if (req.url.endsWith("/copilot_internal/user")) {
        return jsonResponse({ endpoints: { api: "https://api.individual.githubcopilot.com" } });
      }
      if (req.url.endsWith("/models")) {
        return jsonResponse({ data: CATALOG });
      }
      if (req.url === "https://api.individual.githubcopilot.com/responses") {
        return sseResponse([
          `event: response.created\ndata: ${JSON.stringify({
            type: "response.created",
            response: { id: "resp_1", created_at: 1700000000, model: "gpt-6-sol" },
          })}\n\n`,
          `event: response.output_text.delta\ndata: ${JSON.stringify({
            type: "response.output_text.delta",
            item_id: "item_1",
            output_index: 0,
            content_index: 0,
            delta: "Hi from GPT",
          })}\n\n`,
          `event: response.completed\ndata: ${JSON.stringify({
            type: "response.completed",
            response: {
              id: "resp_1",
              model: "gpt-6-sol",
              status: "completed",
              usage: { input_tokens: 4, output_tokens: 3, total_tokens: 7 },
            },
          })}\n\n`,
        ]);
      }
      throw new Error(`Unexpected URL: ${req.url}`);
    });

    const provider = createCopilotInferenceProvider({
      authorize: async () => "gho_test_token",
      storage,
      modelIcon: "copilot.svg",
      fetch: fetcher,
    });

    const result = await provider.streamCopilotCompletion(
      { id: "gpt-6-sol", title: "GPT-6 Sol" },
      baseRequest({
        providerOptions: {
          raycast: {
            sessionId: "s1",
            locale: "en-GB",
            currentDate: "2026-11-24",
            reasoningEffort: "medium",
          },
        },
      }),
    );

    let text = "";
    for await (const chunk of result.textStream) {
      text += chunk;
    }
    assert.equal(text, "Hi from GPT");

    const infReq = requests.find((r) => r.url === "https://api.individual.githubcopilot.com/responses");
    assert.ok(infReq);
    const body = infReq.body as Record<string, unknown>;
    assert.equal(body.store, false);
    assert.equal(body.max_output_tokens, 32000);
    assert.deepEqual(body.reasoning, { effort: "medium", summary: "auto" });
  });

  it("streams /chat/completions and routes Auto with Copilot-Session-Token", async () => {
    const storage = createMemoryStorage();
    const { fetcher, requests } = createMockFetch((req) => {
      if (req.url.endsWith("/copilot_internal/user")) {
        return jsonResponse({ endpoints: { api: "https://api.individual.githubcopilot.com" } });
      }
      if (req.url.endsWith("/models")) {
        return jsonResponse({ data: CATALOG });
      }
      if (req.url.endsWith("/models/session")) {
        return jsonResponse({
          session_token: "auto-jwt-token",
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          available_models: ["gemini-3.8-flash"],
          selected_model: "gemini-3.8-flash",
        });
      }
      if (req.url === "https://api.individual.githubcopilot.com/chat/completions") {
        return sseResponse([
          `data: ${JSON.stringify({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1700000000,
            model: "gemini-3.8-flash",
            choices: [{ index: 0, delta: { role: "assistant", content: "Auto OK" }, finish_reason: null }],
          })}\n\n`,
          `data: ${JSON.stringify({
            id: "chatcmpl-1",
            object: "chat.completion.chunk",
            created: 1700000000,
            model: "gemini-3.8-flash",
            choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
          })}\n\n`,
          "data: [DONE]\n\n",
        ]);
      }
      throw new Error(`Unexpected URL: ${req.url}`);
    });

    const provider = createCopilotInferenceProvider({
      authorize: async () => "gho_test_token",
      storage,
      modelIcon: "copilot.svg",
      fetch: fetcher,
    });

    const result = await provider.streamCopilotCompletion(
      { id: AUTO_MODEL_ID, title: "Auto" },
      // Also verify missing providerOptions.raycast does not crash
      { messages: [{ role: "user", content: "ping" }] } as unknown as AI.ModelRequest,
    );

    let text = "";
    for await (const chunk of result.textStream) {
      text += chunk;
    }
    assert.equal(text, "Auto OK");

    const infReq = requests.find((r) => r.url === "https://api.individual.githubcopilot.com/chat/completions");
    assert.ok(infReq);
    assert.equal(infReq.headers["copilot-session-token"], "auto-jwt-token");
    assert.equal((infReq.body as Record<string, unknown>).max_tokens, 65536);
  });

  it("propagates HTTP 403 as non-retryable APICallError and invalidates catalog cache on HTTP 400", async () => {
    let currentNow = 1_700_000_000_000;
    let modelFetches = 0;
    let inferenceStatus = 403;
    const storage = createMemoryStorage();
    const { fetcher } = createMockFetch((req) => {
      if (req.url.endsWith("/copilot_internal/user")) {
        return jsonResponse({ endpoints: { api: "https://api.individual.githubcopilot.com" } });
      }
      if (req.url.endsWith("/models")) {
        modelFetches += 1;
        return jsonResponse({ data: CATALOG });
      }
      if (req.url.endsWith("/v1/messages")) {
        return new Response("Access to this endpoint is forbidden. Please review our Terms of Service.", {
          status: inferenceStatus,
          headers: { "content-type": "text/plain" },
        });
      }
      throw new Error(`Unexpected URL: ${req.url}`);
    });

    const provider = createCopilotInferenceProvider({
      authorize: async () => "gho_test_token",
      storage,
      modelIcon: "copilot.svg",
      fetch: fetcher,
      now: () => currentNow,
    });

    // First call caches catalog and surfaces APICallError(403, isRetryable: false)
    const res403 = await provider.streamCopilotCompletion(
      { id: "claude-sonnet-5.5", title: "Claude Sonnet 5.5" },
      baseRequest(),
    );
    let caught403: unknown;
    for await (const part of res403.fullStream) {
      if (part.type === "error") caught403 = part.error;
    }
    assert.equal(APICallError.isInstance(caught403), true);
    assert.equal((caught403 as APICallError).statusCode, 403);
    assert.equal((caught403 as APICallError).isRetryable, false);
    assert.equal(modelFetches, 1);

    // Second call within TTL uses cache, returns 400 -> invalidates catalog cache
    inferenceStatus = 400;
    const res400 = await provider.streamCopilotCompletion(
      { id: "claude-sonnet-5.5", title: "Claude Sonnet 5.5" },
      baseRequest(),
    );
    for await (const part of res400.fullStream) {
      if (part.type === "error") {
        assert.equal((part.error as APICallError).statusCode, 400);
      }
    }
    assert.equal(modelFetches, 1);

    // Next call must re-fetch catalog because 400 invalidated it
    const resAfterInvalidate = await provider.streamCopilotCompletion(
      { id: "claude-sonnet-5.5", title: "Claude Sonnet 5.5" },
      baseRequest(),
    );
    for await (const part of resAfterInvalidate.fullStream) {
      void part;
    }
    assert.equal(modelFetches, 2);

    // Advancing clock past CACHE_TTL_MS triggers a fresh catalog fetch
    currentNow += CACHE_TTL_MS + 1000;
    const resAfterTtl = await provider.streamCopilotCompletion(
      { id: "claude-sonnet-5.5", title: "Claude Sonnet 5.5" },
      baseRequest(),
    );
    for await (const part of resAfterTtl.fullStream) {
      void part;
    }
    assert.equal(modelFetches, 3);

    // clearCache removes all inference-v2-* keys
    await provider.clearCache();
    assert.equal(storage.map.size, 0);
  });
});
