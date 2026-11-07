import type {
  ChatAdapter,
  ChatRequest,
  FinishReason,
  ProviderProfile,
  RawModel,
  StreamEvent,
  TokenUsage,
} from "../core/types";
import { isRecord } from "../core/guards";
import {
  errorFromPayload,
  fetchJson,
  fetchStream,
  optionalNumber,
  optionalString,
  parseEventData,
  truncatedStreamError,
} from "./http";
import { DEFAULT_MAX_OUTPUT_TOKENS, reasoningParams } from "./params";
import { ANTHROPIC_VERSION } from "./profiles";
import { parseSse } from "./sse";

const MODELS_PAGE_SIZE = 1000;
/** Guards against a server that keeps reporting `has_more`. */
const MAX_MODEL_PAGES = 20;

function headers(apiKey: string): Record<string, string> {
  return { "x-api-key": apiKey, "anthropic-version": ANTHROPIC_VERSION };
}

/**
 * Stop reasons per platform.claude.com/docs/en/build-with-claude/handling-stop-reasons, checked 2026-11-02.
 * `model_context_window_exceeded` truncates the output just like `max_tokens`.
 */
function toFinishReason(stopReason: string): FinishReason {
  switch (stopReason) {
    case "end_turn":
    case "stop_sequence":
      return "stop";
    case "max_tokens":
    case "model_context_window_exceeded":
      return "length";
    case "refusal":
      return "refusal";
    default:
      return "other";
  }
}

/**
 * `temperature` is left out by design: on `2026-10-21` any value returns 400. `thinking` is left out too, because
 * Opus 5.5 and Sonnet 5.5 reject `disabled` and `budget_tokens`, while `output_config.effort` works on its own.
 * `fallbacks` stays unset, a model switch must be the user's decision.
 */
function buildBody(req: ChatRequest): Record<string, unknown> {
  return {
    model: req.model,
    max_tokens: req.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    stream: true,
    ...(req.system === "" ? {} : { system: req.system }),
    messages: [{ role: "user", content: req.user }],
    ...reasoningParams("anthropic", req.reasoning),
  };
}

/** Event flow per platform.claude.com/docs/en/build-with-claude/streaming, checked 2026-11-02. */
async function* stream(profile: ProviderProfile, apiKey: string, req: ChatRequest): AsyncGenerator<StreamEvent> {
  const context = { sensitive: [req.system, req.user] };
  const bytes = fetchStream({
    provider: "anthropic",
    url: `${profile.baseUrl}/messages`,
    headers: headers(apiKey),
    body: buildBody(req),
    signal: req.signal,
    context,
  });

  let inputTokens: number | undefined;
  let outputTokens: number | undefined;
  let stopReason: string | undefined;

  const finish = (): StreamEvent => {
    const usage: TokenUsage | undefined =
      inputTokens === undefined || outputTokens === undefined
        ? undefined
        : { input: inputTokens, output: outputTokens };
    return {
      type: "done",
      finishReason: toFinishReason(stopReason ?? ""),
      ...(usage === undefined ? {} : { usage }),
    };
  };

  for await (const sse of parseSse(bytes)) {
    const payload = parseEventData("anthropic", sse.data);
    if (!isRecord(payload)) continue;

    switch (payload.type) {
      case "content_block_delta": {
        // Only text deltas count. `thinking_delta` and `signature_delta` must never reach the result.
        const delta = payload.delta;
        if (isRecord(delta) && delta.type === "text_delta" && typeof delta.text === "string" && delta.text !== "") {
          yield { type: "text", text: delta.text };
        }
        break;
      }
      case "message_start": {
        const usage = isRecord(payload.message) ? payload.message.usage : undefined;
        if (isRecord(usage)) {
          inputTokens = optionalNumber(usage.input_tokens);
          outputTokens = optionalNumber(usage.output_tokens);
        }
        break;
      }
      case "message_delta": {
        if (isRecord(payload.delta)) stopReason = optionalString(payload.delta.stop_reason) ?? stopReason;
        // `output_tokens` is cumulative, so the last value is the total.
        if (isRecord(payload.usage)) {
          outputTokens = optionalNumber(payload.usage.output_tokens) ?? outputTokens;
          inputTokens = optionalNumber(payload.usage.input_tokens) ?? inputTokens;
        }
        break;
      }
      case "message_stop":
        yield finish();
        return;
      case "error":
        throw errorFromPayload("anthropic", payload, context);
      default:
        break; // `ping` and block boundaries carry nothing we need; new event types must not break the stream.
    }
  }

  if (stopReason === undefined) throw truncatedStreamError("anthropic");
  yield finish();
}

function toRawModel(item: Record<string, unknown>, id: string): RawModel {
  const capabilities = isRecord(item.capabilities) ? item.capabilities : undefined;
  const effort = capabilities !== undefined && isRecord(capabilities.effort) ? capabilities.effort : undefined;
  const supportsReasoning = typeof effort?.supported === "boolean" ? effort.supported : undefined;
  const name = optionalString(item.display_name);
  const contextLength = optionalNumber(item.max_input_tokens);
  const maxOutputTokens = optionalNumber(item.max_tokens);
  return {
    id,
    ...(name === undefined ? {} : { name }),
    ...(contextLength === undefined ? {} : { contextLength }),
    ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
    ...(supportsReasoning === undefined ? {} : { supportsReasoning }),
    // Fixed by the API version, whatever the model.
    supportsTemperature: false,
  };
}

/** Cursor pagination per platform.claude.com/docs/en/api/models/list, checked 2026-11-02. */
async function listModels(profile: ProviderProfile, apiKey: string, signal?: AbortSignal): Promise<RawModel[]> {
  const models: RawModel[] = [];
  let afterId: string | undefined;

  for (let page = 0; page < MAX_MODEL_PAGES; page++) {
    const query = new URLSearchParams({ limit: String(MODELS_PAGE_SIZE) });
    if (afterId !== undefined) query.set("after_id", afterId);
    const payload = await fetchJson({
      provider: "anthropic",
      url: `${profile.baseUrl}/models?${query}`,
      headers: headers(apiKey),
      signal,
    });
    if (!isRecord(payload) || !Array.isArray(payload.data)) break;

    for (const item of payload.data) {
      const id = isRecord(item) ? optionalString(item.id) : undefined;
      if (isRecord(item) && id !== undefined) models.push(toRawModel(item, id));
    }
    afterId = optionalString(payload.last_id);
    if (payload.has_more !== true || afterId === undefined) break;
  }
  return models;
}

export const anthropicAdapter: ChatAdapter = { stream, listModels };
