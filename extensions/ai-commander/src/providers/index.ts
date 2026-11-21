import { ProviderError } from "../core/errors";
import type { ChatAdapter, ChatRequest, ModelRef, ProviderId, ProviderProfile, StreamEvent } from "../core/types";
import { anthropicAdapter } from "./anthropic";
import { fetchJson } from "./http";
import { openAiCompatibleAdapter } from "./openai-compatible";
import { PROFILES, PROVIDER_LABELS } from "./profiles";
import { ThinkFilter } from "./think-filter";

export { PROFILES, PROVIDER_LABELS } from "./profiles";
export {
  DEFAULT_MAX_OUTPUT_TOKENS,
  resolveMaxOutputTokens,
  resolveOpenRouterProvider,
  resolveTemperature,
  supportedReasoning,
  supportsCreativity,
} from "./params";

export function getProfile(provider: ProviderId): ProviderProfile {
  return PROFILES[provider];
}

export function getAdapter(profile: ProviderProfile): ChatAdapter {
  return profile.adapter === "anthropic" ? anthropicAdapter : openAiCompatibleAdapter;
}

/**
 * Checks a key and returns the number of available models. OpenRouter's model list is public and answers 200 even with
 * an invalid key, so that key is checked at `GET /key`, which answers 401 (tried 2026-11-02). The other three providers
 * require a valid key for their model lists.
 */
export async function testConnection(provider: ProviderId, apiKey: string): Promise<number> {
  const profile = getProfile(provider);
  if (provider === "openrouter") {
    await fetchJson({ provider, url: `${profile.baseUrl}/key`, headers: { authorization: `Bearer ${apiKey}` } });
  }
  return (await getAdapter(profile).listModels(profile, apiKey)).length;
}

function emptyResultError(provider: ProviderId, finishReason: string): ProviderError {
  const message =
    finishReason === "length"
      ? "The model used up its output limit before writing a result. Try a lower reasoning level."
      : "The model returned no text.";
  return new ProviderError("empty-result", message, provider);
}

export interface StreamChatOptions {
  /** Keeps `<think>` tags, for input that contains them literally: a model may echo them as real content. */
  preserveThinkTags?: boolean;
}

function incompleteError(provider: ProviderId, message: string): ProviderError {
  return new ProviderError("incomplete", message, provider);
}

/**
 * Runs one request and filters `<think>` blocks out of the text.
 *
 * Refusals, empty results, and anything cut short are thrown here, after the stream ended. Consumers can therefore treat a `done` event as
 * "this text is a complete, usable result" and cannot insert a partial answer by forgetting to check `finishReason`.
 * Refused or failed runs may have emitted text before the error, which is only fit for display.
 */
export async function* streamChat(
  ref: ModelRef,
  apiKey: string,
  req: Omit<ChatRequest, "model">,
  options: StreamChatOptions = {},
): AsyncGenerator<StreamEvent> {
  const profile = getProfile(ref.provider);
  const filter = new ThinkFilter();
  let hasVisibleText = false;

  for await (const event of getAdapter(profile).stream(profile, apiKey, { ...req, model: ref.modelId })) {
    if (event.type === "text") {
      const text = options.preserveThinkTags ? event.text : filter.push(event.text);
      if (text === "") continue;
      hasVisibleText ||= text.trim() !== "";
      yield { type: "text", text };
      continue;
    }

    const rest = filter.flush();
    if (rest !== "") {
      hasVisibleText ||= rest.trim() !== "";
      yield { type: "text", text: rest };
    }
    if (event.finishReason === "refusal") {
      const label = PROVIDER_LABELS[ref.provider];
      throw new ProviderError(
        "refusal",
        `The ${label} model declined this request. Try a different model.`,
        ref.provider,
      );
    }
    if (!hasVisibleText) throw emptyResultError(ref.provider, event.finishReason);
    // A cut-off text must never overwrite the user's selection as if it were finished.
    if (event.finishReason === "length") {
      throw incompleteError(ref.provider, "The model reached its output limit before finishing.");
    }
    if (event.finishReason === "other" || filter.unclosed) {
      throw incompleteError(ref.provider, "The model stopped before finishing its answer.");
    }
    yield event;
    return;
  }
  throw incompleteError(ref.provider, "The connection ended before the answer was complete.");
}
