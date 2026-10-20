import { z } from "zod";
import { resolveBaseUrl } from "../baseUrl";
import { createLogger } from "../logger";
import { providerError, type RateLimitDiagnostics } from "../providerError";
import { TextResponseJsonSchema, WordResponseJsonSchema } from "../types";
import { postWithRetry, readApiResponse, stripCodeFences } from "./transport";
import type { JsonTransport } from "./types";

const log = createLogger("anthropic");

const ANTHROPIC_VERSION = "2023-06-01";
// Thinking tokens count toward this cap; see AGENTS.md → Providers → Seam contract.
const MAX_TOKENS = 16000;

const AnthropicMessageResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  stop_reason: z.string().nullable(),
});

type JsonSchemaNode = Record<string, unknown>;

function isRecord(value: unknown): value is JsonSchemaNode {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Rewrite a Gemini-dialect schema for Anthropic structured outputs, which
 * reject `propertyOrdering`, `maxItems`, and any `minItems` above 1. Keys of a
 * `properties` map are field names, not keywords, so they are never dropped.
 */
function toAnthropicSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(toAnthropicSchema);
  if (!isRecord(node)) return node;

  const out: JsonSchemaNode = {};
  for (const [key, value] of Object.entries(node)) {
    if (key === "propertyOrdering" || key === "maxItems") continue;
    if (key === "minItems" && typeof value === "number" && value > 1) continue;
    out[key] =
      key === "properties" && isRecord(value)
        ? Object.fromEntries(Object.entries(value).map(([name, child]) => [name, toAnthropicSchema(child)]))
        : toAnthropicSchema(value);
  }
  return out;
}

/** `{"type":"error","error":{"type":"rate_limit_error","message":"..."}}`; the delay comes from `Retry-After`. */
function parseAnthropicRateLimit(body: string): RateLimitDiagnostics | undefined {
  const parsed: unknown = JSON.parse(body);
  const error = isRecord(parsed) ? parsed.error : undefined;
  const message = isRecord(error) && typeof error.message === "string" ? error.message : undefined;
  const firstLine = message?.split(/\r?\n/, 1)[0]?.slice(0, 240);
  return firstLine ? { message: firstLine } : undefined;
}

export const anthropicJsonTransport: JsonTransport = async (config, req) => {
  const model = config.model.trim();
  const resolvedBaseUrl = resolveBaseUrl(config.baseUrl, "anthropic", "translate");
  const totalMs = log.timer();

  // No temperature/top_p: newer Claude models reject non-default sampling.
  const response = await postWithRetry({
    url: `${resolvedBaseUrl}/messages`,
    headers: { "x-api-key": config.apiKey, "anthropic-version": ANTHROPIC_VERSION },
    body: {
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: req.prompt }],
      output_config: {
        format: { type: "json_schema", schema: toAnthropicSchema(req.schema) },
        ...(config.reasoningEffort ? { effort: config.reasoningEffort } : {}),
      },
    },
    signal: req.signal,
    context: {
      provider: "anthropic",
      surface: "translate",
      model,
      resolvedBaseUrl,
      parseRateLimit: parseAnthropicRateLimit,
    },
  });

  const message = await readApiResponse(response, AnthropicMessageResponseSchema, {
    provider: "anthropic",
    surface: "translate",
    signal: req.signal,
  });

  // A refusal or a cut-off answer can still carry partial text that would fail
  // validation downstream with a less accurate error.
  if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") {
    log.warn("message stopped early", { model, stopReason: message.stop_reason });
    throw providerError({
      domain: "infrastructure",
      kind: "invalid-response",
      surface: "translate",
      provider: "anthropic",
    });
  }

  const raw = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");

  if (!raw.trim()) {
    throw providerError({
      domain: "infrastructure",
      kind: "empty-response",
      surface: "translate",
      provider: "anthropic",
    });
  }

  log.debug("translation request completed", { model, totalMs: totalMs(), responseChars: raw.length });
  return stripCodeFences(raw);
};

if (import.meta.vitest) {
  const { afterEach, beforeEach, describe, expect, it, vi } = import.meta.vitest;

  const CONFIG = { provider: "anthropic", apiKey: "sk-ant-key", model: "claude-haiku-5-5", baseUrl: "" } as const;
  const REQ = { prompt: "hi", schema: TextResponseJsonSchema as unknown as Record<string, unknown> };

  function messageResponse(content: unknown[], stopReason: string | null = "end_turn"): Response {
    return new Response(JSON.stringify({ content, stop_reason: stopReason }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  function collectKeys(node: unknown, keys = new Set<string>()): Set<string> {
    if (Array.isArray(node)) node.forEach((item) => collectKeys(item, keys));
    else if (isRecord(node)) {
      for (const [key, value] of Object.entries(node)) {
        keys.add(key);
        collectKeys(value, keys);
      }
    }
    return keys;
  }

  describe("toAnthropicSchema", () => {
    const word = toAnthropicSchema(WordResponseJsonSchema) as JsonSchemaNode;
    const sense = (word.properties as { senses: { items: { properties: Record<string, JsonSchemaNode> } } }).senses
      .items;

    it("drops every keyword Anthropic structured outputs reject from the word schema", () => {
      const keys = collectKeys(word);
      expect(keys.has("propertyOrdering")).toBe(false);
      expect(keys.has("maxItems")).toBe(false);
    });

    it("keeps enums, required lists and closed objects", () => {
      expect(sense.properties.partOfSpeech.enum).toEqual(
        WordResponseJsonSchema.properties.senses.items.properties.partOfSpeech.enum,
      );
      expect(sense.properties.register.enum).toEqual(
        WordResponseJsonSchema.properties.senses.items.properties.register.enum,
      );
      expect(word.required).toEqual(["senses"]);
      expect(word.additionalProperties).toBe(false);
      expect((sense as unknown as JsonSchemaNode).additionalProperties).toBe(false);
    });

    it("does not mutate the shared source schema", () => {
      expect(WordResponseJsonSchema.propertyOrdering).toBeDefined();
      expect(WordResponseJsonSchema.properties.senses.maxItems).toBe(5);
    });

    it("drops minItems above 1 but keeps 0 and 1", () => {
      expect(toAnthropicSchema({ type: "array", minItems: 2 })).toEqual({ type: "array" });
      expect(toAnthropicSchema({ type: "array", minItems: 1 })).toEqual({ type: "array", minItems: 1 });
    });

    it("keeps a field whose name collides with a dropped keyword", () => {
      const schema = { type: "object", properties: { maxItems: { type: "number" } }, propertyOrdering: ["maxItems"] };
      expect(toAnthropicSchema(schema)).toEqual({ type: "object", properties: { maxItems: { type: "number" } } });
    });
  });

  describe("anthropicJsonTransport", () => {
    beforeEach(() => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => messageResponse([{ type: "text", text: '{"translation":"x"}' }])),
      );
      vi.spyOn(Math, "random").mockReturnValue(0);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("posts to the Messages API with key and version headers and a JSON-schema output format", async () => {
      await anthropicJsonTransport(CONFIG, { prompt: "hi", schema: WordResponseJsonSchema as never });

      const [url, init] = vi.mocked(fetch).mock.calls[0];
      expect(url).toBe("https://api.anthropic.com/v1/messages");
      expect(init?.headers).toEqual({
        "Content-Type": "application/json",
        "x-api-key": "sk-ant-key",
        "anthropic-version": "2023-06-01",
      });
      const body = JSON.parse(init?.body as string);
      expect(body).toEqual({
        model: "claude-haiku-5-5",
        max_tokens: 16000,
        messages: [{ role: "user", content: "hi" }],
        output_config: { format: { type: "json_schema", schema: toAnthropicSchema(WordResponseJsonSchema) } },
      });
      expect(body).not.toHaveProperty("temperature");
      expect(body).not.toHaveProperty("top_p");
    });

    it("sends output_config.effort next to the format only when the config carries one", async () => {
      await anthropicJsonTransport({ ...CONFIG, reasoningEffort: "low" }, REQ);
      const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
      expect(body.output_config).toEqual({
        format: { type: "json_schema", schema: toAnthropicSchema(REQ.schema) },
        effort: "low",
      });
      expect(body).not.toHaveProperty("thinking");
    });

    it("sends the request to a custom base URL path as given", async () => {
      await anthropicJsonTransport({ ...CONFIG, baseUrl: "http://localhost:8317/v1" }, REQ);
      expect(vi.mocked(fetch).mock.calls[0][0]).toBe("http://localhost:8317/v1/messages");
    });

    it("joins every text block, skips other block types, and strips code fences", async () => {
      vi.mocked(fetch).mockResolvedValue(
        messageResponse([
          { type: "thinking", thinking: "..." },
          { type: "text", text: '```json\n{"translation":' },
          { type: "text", text: '"x"}\n```' },
        ]),
      );
      await expect(anthropicJsonTransport(CONFIG, REQ)).resolves.toBe('{"translation":"x"}');
    });

    it.each(["refusal", "max_tokens"])("maps stop_reason %s to invalid-response", async (stopReason) => {
      vi.mocked(fetch).mockResolvedValue(messageResponse([{ type: "text", text: '{"transl' }], stopReason));
      await expect(anthropicJsonTransport(CONFIG, REQ)).rejects.toMatchObject({
        cause: { domain: "infrastructure", kind: "invalid-response", surface: "translate", provider: "anthropic" },
      });
    });

    it.each([[[]], [[{ type: "text", text: "  " }]]])(
      "maps an answer without text to empty-response",
      async (content) => {
        vi.mocked(fetch).mockResolvedValue(messageResponse(content));
        await expect(anthropicJsonTransport(CONFIG, REQ)).rejects.toMatchObject({
          cause: { kind: "empty-response", provider: "anthropic" },
        });
      },
    );

    it("maps an envelope that is not a Messages response to invalid-response", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('{"unexpected":"shape"}', { status: 200 }));
      await expect(anthropicJsonTransport(CONFIG, REQ)).rejects.toMatchObject({
        cause: { kind: "invalid-response", provider: "anthropic" },
      });
    });

    it("maps 401 to invalid-api-key without retrying", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 401 }));
      await expect(anthropicJsonTransport(CONFIG, REQ)).rejects.toMatchObject({
        cause: { kind: "invalid-api-key", provider: "anthropic" },
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("maps 404 on the default endpoint to model-not-found without an endpoint host", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 404 }));
      const err = await anthropicJsonTransport(CONFIG, REQ).catch((e: unknown) => e);
      expect(err).toMatchObject({ cause: { kind: "model-not-found", model: "claude-haiku-5-5" } });
      expect((err as { cause: { endpointHost?: string } }).cause.endpointHost).toBeUndefined();
    });

    it("names the endpoint host when a custom base URL returns 404", async () => {
      vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 404 }));
      await expect(
        anthropicJsonTransport({ ...CONFIG, baseUrl: "https://gw.corp:8443/claude" }, REQ),
      ).rejects.toMatchObject({ cause: { kind: "model-not-found", endpointHost: "gw.corp:8443" } });
    });

    it("records Retry-After and the error message on a 429 after exhausting retries", async () => {
      const body = JSON.stringify({ type: "error", error: { type: "rate_limit_error", message: "Slow down" } });
      vi.mocked(fetch).mockImplementation(
        async () => new Response(body, { status: 429, headers: { "retry-after": "17" } }),
      );
      await expect(anthropicJsonTransport(CONFIG, REQ)).rejects.toMatchObject({
        cause: {
          kind: "request-failed",
          provider: "anthropic",
          status: 429,
          rateLimit: { message: "Slow down", retryDelay: "17s" },
        },
      });
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it("retries a 529 overloaded response and returns the next success", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response('{"type":"error"}', { status: 529 }))
        .mockResolvedValueOnce(messageResponse([{ type: "text", text: '{"translation":"x"}' }]));
      await expect(anthropicJsonTransport(CONFIG, REQ)).resolves.toBe('{"translation":"x"}');
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("maps a network TypeError to network-offline", async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError("fetch failed"));
      await expect(anthropicJsonTransport(CONFIG, REQ)).rejects.toMatchObject({
        cause: { kind: "network-offline", provider: "anthropic" },
      });
    });

    it("propagates an abort unchanged and stops retrying", async () => {
      const controller = new AbortController();
      const abortError = new DOMException("Aborted", "AbortError");
      vi.mocked(fetch).mockImplementation(async () => {
        controller.abort(abortError);
        throw abortError;
      });
      await expect(anthropicJsonTransport(CONFIG, { ...REQ, signal: controller.signal })).rejects.toBe(abortError);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(vi.mocked(fetch).mock.calls[0][1]?.signal).toBe(controller.signal);
    });
  });
}
