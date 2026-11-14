import type { ApiKeys } from "../core/preferences";
import type { CatalogEntry, ModelRef } from "../core/types";
import { directProviderOf, type DirectProviderId } from "./filters";

/**
 * The route follows the keys: a family with its own API key runs directly, and OpenRouter serves it otherwise. Each
 * model is therefore listed once, and there is no route setting.
 *
 * This is decided by configuration only. A failing direct call never moves to OpenRouter, because that would send the
 * text to another processor without the user's knowledge.
 */

/** Claude IDs use dashes directly and dots on OpenRouter: `claude-sonnet-5-5`, `anthropic/claude-sonnet-5.5`. */
function toOpenRouterId(provider: DirectProviderId, modelId: string): string {
  const id = modelId.replace(/^models\//, "");
  switch (provider) {
    case "anthropic":
      return `anthropic/${id.replace(/-(\d)-(\d)$/, "-$1.$2")}`;
    case "openai":
      return `openai/${id}`;
    case "gemini":
      return `google/${id}`;
  }
}

function toDirectId(provider: DirectProviderId, openRouterId: string): string {
  const id = openRouterId.slice(openRouterId.indexOf("/") + 1);
  return provider === "anthropic" ? id.replace(/-(\d)\.(\d)$/, "-$1-$2") : id;
}

/**
 * The route a saved model takes with the current keys. Prompts store whichever route they were saved with, so this
 * keeps them working when a key is added or removed. IDs are mapped by rule; if a model has no counterpart, the
 * provider's "unknown model" answer offers the model picker.
 */
export function routeModel(ref: ModelRef, keys: ApiKeys): ModelRef {
  if (ref.provider === "openrouter") {
    const direct = directProviderOf(ref.modelId);
    return direct && keys[direct] ? { provider: direct, modelId: toDirectId(direct, ref.modelId) } : ref;
  }
  if (keys[ref.provider] || !keys.openrouter) return ref;
  return { provider: "openrouter", modelId: toOpenRouterId(ref.provider, ref.modelId) };
}

/** Hides the OpenRouter copy of every family that has its own key. */
export function visibleEntries(entries: readonly CatalogEntry[], keys: ApiKeys): CatalogEntry[] {
  return entries.filter((entry) => {
    if (entry.ref.provider !== "openrouter") return true;
    const direct = directProviderOf(entry.ref.modelId);
    return direct === undefined || !keys[direct];
  });
}
