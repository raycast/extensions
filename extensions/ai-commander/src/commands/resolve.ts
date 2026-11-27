import { createCatalogStore } from "../catalog/cache";
import { findEntry } from "../catalog/build";
import { routeModel } from "../catalog/routing";
import { getApiKeys } from "../core/preferences";
import type { CatalogEntry, ModelRef, OpenRouterProviderOptions, PromptDef, ReasoningLevel } from "../core/types";
import { getRunSettings } from "../prompts/store";
import {
  PROVIDER_LABELS,
  resolveMaxOutputTokens,
  resolveOpenRouterProvider,
  resolveTemperature,
  supportedReasoning,
} from "../providers";
import { RunFailure } from "./failure";

/** All provider-side settings of one run. */
export interface ResolvedRun {
  ref: ModelRef;
  apiKey: string;
  entry?: CatalogEntry;
  reasoning: ReasoningLevel;
  temperature?: number;
  maxOutputTokens?: number;
  openRouterProvider?: OpenRouterProviderOptions;
}

/**
 * Picks model and parameters. The catalog is read from the cache only: a run must not wait for a model list, and
 * every value it supplies has a safe default.
 *
 * A prompt without a model inherits the default model together with its reasoning level, like Raycast's "Default".
 * A level the prompt chose itself is sent as is, so an unsupported combination fails loudly. Only a model picked for
 * a single run drops a level it cannot use, because the user did not choose that combination. The same holds when
 * the route changed: a level chosen for one route says nothing about the other.
 */
export async function resolveRun(prompt: PromptDef, modelOverride?: ModelRef): Promise<ResolvedRun> {
  const { defaultModel, openRouterPrivacy } = await getRunSettings();
  const requested = modelOverride ?? prompt.model ?? defaultModel?.ref;
  if (!requested) {
    throw new RunFailure("no-default-model", "No Default Model", "Choose a default model to run this prompt.");
  }

  const keys = getApiKeys();
  const ref = routeModel(requested, keys);
  const apiKey = keys[ref.provider];
  if (!apiKey) {
    const label = PROVIDER_LABELS[ref.provider];
    const accepted = ref.provider === "openrouter" ? label : `${label} or OpenRouter`;
    throw new RunFailure("missing-key", `${label} API Key Missing`, `Add your ${accepted} API key in the preferences.`);
  }

  const entry = findEntry(createCatalogStore().read().entries, ref);
  let reasoning = prompt.model ? prompt.reasoning : (defaultModel?.reasoning ?? "default");
  const rerouted = ref.provider !== requested.provider;
  if ((modelOverride || rerouted) && !supportedReasoning(ref, entry).includes(reasoning)) reasoning = "default";

  return {
    ref,
    apiKey,
    entry,
    reasoning,
    temperature: resolveTemperature(prompt.creativity, ref, entry, reasoning),
    maxOutputTokens: resolveMaxOutputTokens(entry),
    openRouterProvider:
      ref.provider === "openrouter" ? resolveOpenRouterProvider(openRouterPrivacy, prompt.privacy) : undefined,
  };
}
