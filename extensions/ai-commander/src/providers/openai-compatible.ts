import type {
  ChatAdapter,
  ChatRequest,
  FinishReason,
  ModelPricing,
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
import { reasoningParams } from "./params";
import { parseSse } from "./sse";

const OPENROUTER_MAX_MODEL_PAGES = 20;
const GEMINI_PAGE_SIZE = 1000;
const GEMINI_MAX_MODEL_PAGES = 20;

/**
 * Pro models have no Chat Completions route (developers.openai.com/api/docs/models/gpt-5.5-pro, 2026-11-02: "Responses
 * API" and "Batch API" only). Listing them would offer a model that can only fail, and the OpenAI listing has no
 * capability field to detect this. Checked for gpt-5.5-pro; the pattern extends that to the other `-pro` models.
 */
export function isChatCompletionsModel(modelId: string): boolean {
  return !/-pro(-|$)/.test(modelId);
}

function chatUrl(profile: ProviderProfile): string {
  return `${profile.baseUrl.replace(/\/$/, "")}/chat/completions`;
}

function bearer(apiKey: string): Record<string, string> {
  return { authorization: `Bearer ${apiKey}` };
}

/**
 * Parameter choices, checked 2026-11-02:
 * - The token limit is sent only when the catalog knows the model's maximum, because a blind cap would exceed the limit
 *   of small models. It bounds a runaway answer and lowers what OpenRouter reserves on the account. OpenAI's field is
 *   `max_completion_tokens`, since `max_tokens` is deprecated there (API reference); Gemini and OpenRouter use
 *   `max_tokens`. OpenAI's model list reports no limits, so its models run without one.
 * - `stream_options.include_usage` is how OpenAI opts into usage, and Google's compat page uses it the same way.
 *   OpenRouter documents it as deprecated with no effect, because usage is always included.
 * - `provider` exists on OpenRouter only.
 */
function outputLimit(profile: ProviderProfile, limit: number | undefined): Record<string, number> {
  if (limit === undefined) return {};
  return { [profile.id === "openai" ? "max_completion_tokens" : "max_tokens"]: limit };
}

function buildBody(profile: ProviderProfile, req: ChatRequest): Record<string, unknown> {
  const isOpenRouter = profile.id === "openrouter";
  const provider = req.openRouterProvider;
  return {
    model: req.model,
    stream: true,
    messages: [
      ...(req.system === "" ? [] : [{ role: "system", content: req.system }]),
      { role: "user", content: req.user },
    ],
    ...reasoningParams(profile.reasoningStyle, req.reasoning),
    ...(req.temperature === undefined ? {} : { temperature: req.temperature }),
    ...outputLimit(profile, req.maxOutputTokens),
    ...(isOpenRouter ? {} : { stream_options: { include_usage: true } }),
    ...(isOpenRouter && provider !== undefined && Object.keys(provider).length > 0 ? { provider } : {}),
  };
}

function isRestricted(req: ChatRequest): boolean {
  const provider = req.openRouterProvider;
  return provider?.zdr === true || provider?.data_collection === "deny" || (provider?.ignore?.length ?? 0) > 0;
}

/** Finish reasons per the OpenAI streaming reference, 2026-11-02. A filtered answer is a refusal for the user. */
function toFinishReason(reason: string | undefined): FinishReason {
  switch (reason) {
    case "stop":
      return "stop";
    case "length":
      return "length";
    case "content_filter":
      return "refusal";
    default:
      return "other";
  }
}

function toUsage(value: unknown): TokenUsage | undefined {
  if (!isRecord(value)) return undefined;
  const input = optionalNumber(value.prompt_tokens);
  const output = optionalNumber(value.completion_tokens);
  return input === undefined || output === undefined ? undefined : { input, output };
}

async function* stream(profile: ProviderProfile, apiKey: string, req: ChatRequest): AsyncGenerator<StreamEvent> {
  const provider = profile.id;
  const context = { sensitive: [req.system, req.user], restricted: isRestricted(req) };
  const bytes = fetchStream({
    provider,
    url: chatUrl(profile),
    headers: bearer(apiKey),
    body: buildBody(profile, req),
    signal: req.signal,
    context,
  });

  let finishReason: string | undefined;
  let refused = false;
  let usage: TokenUsage | undefined;

  const finish = (): StreamEvent => ({
    type: "done",
    finishReason: refused ? "refusal" : toFinishReason(finishReason),
    ...(usage === undefined ? {} : { usage }),
  });

  for await (const sse of parseSse(bytes)) {
    if (sse.data === "[DONE]") {
      yield finish();
      return;
    }
    const chunk = parseEventData(provider, sse.data);
    if (!isRecord(chunk)) continue;

    // OpenRouter reports late failures as a chunk with a top-level `error`, status stays 200
    // (openrouter.ai/docs/api-reference/streaming, 2026-11-02). The same check catches OpenAI-style error events.
    if (chunk.error !== undefined && chunk.error !== null) throw errorFromPayload(provider, chunk, context);

    usage = toUsage(chunk.usage) ?? usage;
    const choice = Array.isArray(chunk.choices) ? chunk.choices[0] : undefined;
    if (!isRecord(choice)) continue;

    // OpenRouter repeats `finish_reason` in its usage chunk, so this is overwritten, never accumulated.
    finishReason = optionalString(choice.finish_reason) ?? finishReason;
    if (!isRecord(choice.delta)) continue;
    const { content, refusal } = choice.delta;
    // `reasoning`, `reasoning_content` and `reasoning_details` are ignored on purpose. Refusal text is not a result.
    if (typeof refusal === "string" && refusal !== "") refused = true;
    if (typeof content === "string" && content !== "") yield { type: "text", text: content };
  }

  // OpenRouter: "an error can be the only event in the stream", so an empty 200 must fail too.
  if (finishReason === undefined) throw truncatedStreamError(provider);
  yield finish();
}

/** OpenAI's list has only IDs and no pagination (developers.openai.com/api/reference, 2026-11-02). */
async function listOpenAi(profile: ProviderProfile, apiKey: string, signal?: AbortSignal): Promise<RawModel[]> {
  const payload = await fetchJson({
    provider: "openai",
    url: `${profile.baseUrl}/models`,
    headers: bearer(apiKey),
    signal,
  });
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];
  return payload.data.flatMap((item: unknown) => {
    const id = isRecord(item) ? optionalString(item.id) : undefined;
    return id !== undefined && isChatCompletionsModel(id) ? [{ id }] : [];
  });
}

/** OpenRouter prices are strings in USD per token; `-1` marks variable-price routers. */
function toPricing(value: unknown): ModelPricing | undefined {
  if (!isRecord(value)) return undefined;
  const input = Number(value.prompt);
  const output = Number(value.completion);
  if (!Number.isFinite(input) || !Number.isFinite(output) || input < 0 || output < 0) return undefined;
  // Rounding removes binary float noise such as 0.30000000000000004.
  const perMillion = (perToken: number) => Math.round(perToken * 1e12) / 1e6;
  return { inputPerMTok: perMillion(input), outputPerMTok: perMillion(output) };
}

function toOpenRouterModel(item: Record<string, unknown>, id: string): RawModel {
  const name = optionalString(item.name);
  const contextLength = optionalNumber(item.context_length);
  const top = isRecord(item.top_provider) ? item.top_provider : undefined;
  const maxOutputTokens = optionalNumber(top?.max_completion_tokens);
  const pricing = toPricing(item.pricing);
  const parameters = Array.isArray(item.supported_parameters) ? (item.supported_parameters as unknown[]) : undefined;
  return {
    id,
    ...(name === undefined ? {} : { name }),
    ...(contextLength === undefined ? {} : { contextLength }),
    ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
    ...(pricing === undefined ? {} : { pricing }),
    ...(parameters === undefined
      ? {}
      : {
          supportsReasoning: parameters.includes("reasoning"),
          supportsTemperature: parameters.includes("temperature"),
        }),
  };
}

/**
 * Per openrouter.ai/docs/api-reference/models/get-models, 2026-11-02. The docs state a limit default of 500 and also
 * that omitting `limit` and `offset` returns everything, so `links.next` decides. Its URL is not followed itself: the
 * key must only ever go to the profile's host.
 */
async function listOpenRouter(profile: ProviderProfile, apiKey: string, signal?: AbortSignal): Promise<RawModel[]> {
  const models: RawModel[] = [];
  let received = 0;

  for (let page = 0; page < OPENROUTER_MAX_MODEL_PAGES; page++) {
    const query = new URLSearchParams({ output_modalities: "text" });
    if (received > 0) query.set("offset", String(received));
    const payload = await fetchJson({
      provider: "openrouter",
      url: `${profile.baseUrl}/models?${query}`,
      headers: bearer(apiKey),
      signal,
    });
    if (!isRecord(payload) || !Array.isArray(payload.data) || payload.data.length === 0) break;

    received += payload.data.length;
    for (const item of payload.data) {
      const id = isRecord(item) ? optionalString(item.id) : undefined;
      if (isRecord(item) && id !== undefined) models.push(toOpenRouterModel(item, id));
    }
    const next = isRecord(payload.links) ? payload.links.next : undefined;
    if (typeof next !== "string") break;
  }
  return models;
}

function toGeminiModel(item: Record<string, unknown>, name: string): RawModel {
  const displayName = optionalString(item.displayName);
  const contextLength = optionalNumber(item.inputTokenLimit);
  const maxOutputTokens = optionalNumber(item.outputTokenLimit);
  return {
    id: name.replace(/^models\//, ""),
    ...(displayName === undefined ? {} : { name: displayName }),
    ...(contextLength === undefined ? {} : { contextLength }),
    ...(maxOutputTokens === undefined ? {} : { maxOutputTokens }),
    ...(typeof item.thinking === "boolean" ? { supportsReasoning: item.thinking } : {}),
    // A model without this field is unknown, not unsupported, so the form keeps the option.
    ...(optionalNumber(item.maxTemperature) === undefined ? {} : { supportsTemperature: true }),
  };
}

/**
 * Uses the native list rather than the OpenAI layer's `/models`: the compat docs show only `id` there, while the native
 * one gives limits, thinking support and generation methods, which also identify text models. Fields and pagination per
 * aistudio.google.com/api-reference/models, 2026-11-02. The key goes in the `x-goog-api-key` header (/docs/api-key)
 * rather than the `key` query parameter of the reference example, so it cannot end up in a logged URL.
 */
async function listGemini(profile: ProviderProfile, apiKey: string, signal?: AbortSignal): Promise<RawModel[]> {
  const url = new URL("../models", profile.baseUrl);
  const models: RawModel[] = [];
  let pageToken: string | undefined;

  for (let page = 0; page < GEMINI_MAX_MODEL_PAGES; page++) {
    const query = new URLSearchParams({ pageSize: String(GEMINI_PAGE_SIZE) });
    if (pageToken !== undefined) query.set("pageToken", pageToken);
    const payload = await fetchJson({
      provider: "gemini",
      url: `${url}?${query}`,
      headers: { "x-goog-api-key": apiKey },
      signal,
    });
    if (!isRecord(payload) || !Array.isArray(payload.models)) break;

    for (const item of payload.models) {
      if (!isRecord(item)) continue;
      const name = optionalString(item.name);
      const methods = Array.isArray(item.supportedGenerationMethods)
        ? (item.supportedGenerationMethods as unknown[])
        : [];
      if (name !== undefined && methods.includes("generateContent")) models.push(toGeminiModel(item, name));
    }
    pageToken = optionalString(payload.nextPageToken);
    if (pageToken === undefined || pageToken === "") break;
  }
  return models;
}

function listModels(profile: ProviderProfile, apiKey: string, signal?: AbortSignal): Promise<RawModel[]> {
  switch (profile.id) {
    case "openrouter":
      return listOpenRouter(profile, apiKey, signal);
    case "gemini":
      return listGemini(profile, apiKey, signal);
    default:
      return listOpenAi(profile, apiKey, signal);
  }
}

export const openAiCompatibleAdapter: ChatAdapter = { stream, listModels };
