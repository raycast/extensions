import { fetchModelsData } from "./api";
import { filterByCapabilities, filterOutDeprecated, hasCapability } from "./filters";
import type { Capability, Model } from "./types";

const MODEL_CAPABILITIES: Capability[] = [
  "reasoning",
  "tool_call",
  "vision",
  "audio",
  "video",
  "pdf",
  "structured_output",
  "open_weights",
  "attachment",
  "temperature",
];

/** Maps common aliases to canonical capability names. */
const CAPABILITY_SYNONYMS: Record<string, Capability> = {
  image: "vision",
  images: "vision",
  function_calling: "tool_call",
  functions: "tool_call",
  tools: "tool_call",
  tool_calls: "tool_call",
};

export type QueryModelsInput = {
  /** Text matched against model ID, name, description, family, provider ID, and provider name. */
  query?: string;
  /** Exact provider ID or name, for example "anthropic" or "Anthropic". */
  provider?: string;
  /** Required capabilities. Use reasoning, tool_call, vision, audio, video, pdf, structured_output, open_weights, attachment, or temperature. Aliases: image→vision, function_calling→tool_call. Multiple values use AND semantics. */
  capabilities?: string[];
  /** Maximum input price in USD per million tokens. */
  maxInputPrice?: number;
  /** Maximum output price in USD per million tokens. */
  maxOutputPrice?: number;
  /** Minimum context-window size in tokens. */
  minContext?: number;
  /** Include deprecated models. Defaults to false. */
  includeDeprecated?: boolean;
  /** Filter by lifecycle status. */
  status?: "stable" | "alpha" | "beta" | "deprecated";
  /** Result order: provider, name, input-price, output-price, context, or release-date. Prices sort low to high; context and release date sort high to low. */
  sort?: string;
  /** Maximum results. Defaults to 10 and is clamped between 1 and 50. */
  limit?: number;
};

function sortModels(models: Model[], sort?: string): Model[] {
  const sorted = [...models];

  switch (sort) {
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "input-price":
      return sorted.sort((a, b) => (a.cost?.input ?? Infinity) - (b.cost?.input ?? Infinity));
    case "output-price":
      return sorted.sort((a, b) => (a.cost?.output ?? Infinity) - (b.cost?.output ?? Infinity));
    case "context":
      return sorted.sort((a, b) => (b.limit?.context ?? 0) - (a.limit?.context ?? 0));
    case "release-date":
      return sorted.sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""));
    case "provider":
    default:
      return sorted.sort((a, b) => a.providerName.localeCompare(b.providerName) || a.name.localeCompare(b.name));
  }
}

/**
 * Search and filter the current models.dev catalog. Returns model capabilities, modalities, pricing, limits, and metadata.
 */
export async function queryModels(input: QueryModelsInput = {}) {
  const { models: allModels } = await fetchModelsData();
  let models = input.includeDeprecated || input.status === "deprecated" ? allModels : filterOutDeprecated(allModels);
  const queryTerms = input.query?.trim().toLowerCase().split(/\s+/).filter(Boolean) ?? [];
  const provider = input.provider?.trim().toLowerCase();

  if (queryTerms.length > 0) {
    models = models.filter((model) => {
      const searchableText = [
        model.id,
        model.name,
        model.description,
        model.family,
        model.providerId,
        model.providerName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return queryTerms.every((term) => searchableText.includes(term));
    });
  }

  if (provider) {
    models = models.filter(
      (model) => model.providerId.toLowerCase() === provider || model.providerName.toLowerCase() === provider,
    );
  }
  if (input.status) {
    models = models.filter((model) => (model.status ?? "stable") === input.status);
  }
  if (input.capabilities?.length) {
    const capabilities: Capability[] = [];
    let hasUnknown = false;
    for (const raw of input.capabilities) {
      const canonical = MODEL_CAPABILITIES.includes(raw as Capability)
        ? (raw as Capability)
        : CAPABILITY_SYNONYMS[raw.toLowerCase()];
      if (canonical) {
        capabilities.push(canonical);
      } else {
        hasUnknown = true;
        break;
      }
    }
    // Fail closed: an unrecognised capability returns no results rather than
    // silently dropping the filter and returning unfiltered models.
    models = hasUnknown ? [] : filterByCapabilities(models, capabilities);
  }
  const { maxInputPrice, maxOutputPrice, minContext } = input;
  if (maxInputPrice !== undefined) {
    models = models.filter((model) => model.cost !== undefined && model.cost.input <= maxInputPrice);
  }
  if (maxOutputPrice !== undefined) {
    models = models.filter((model) => model.cost !== undefined && model.cost.output <= maxOutputPrice);
  }
  if (minContext !== undefined) {
    models = models.filter((model) => model.limit !== undefined && model.limit.context >= minContext);
  }

  models = sortModels(models, input.sort);

  const requestedLimit = input.limit !== undefined && Number.isFinite(input.limit) ? Math.trunc(input.limit) : 10;
  const limit = Math.min(Math.max(requestedLimit, 1), 50);

  return {
    count: models.length,
    models: models.slice(0, limit).map((model) => ({
      id: `${model.providerId}/${model.id}`,
      modelId: model.id,
      name: model.name,
      description: model.description,
      family: model.family,
      providerId: model.providerId,
      providerName: model.providerName,
      providerDocumentation: model.providerDoc,
      capabilities: MODEL_CAPABILITIES.filter((capability) => hasCapability(model, capability)),
      modalities: model.modalities,
      pricing: model.cost,
      limits: model.limit,
      knowledgeCutoff: model.knowledge,
      releaseDate: model.release_date,
      status: model.status ?? "stable",
    })),
  };
}
