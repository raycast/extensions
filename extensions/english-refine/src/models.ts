import { createProvider, providerError, type ProviderConfiguration } from "./provider";

export interface DiscoveredModel {
  id: string;
  name: string;
  efforts: { value: string; description?: string }[];
  defaultEffort?: string;
  fastTier?: "fast" | "priority";
  normalTier?: "default";
  hidden?: boolean;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readModels(response: unknown): DiscoveredModel[] {
  const body = record(response);
  const entries = body.data ?? body.models;
  if (!Array.isArray(entries)) throw new Error("The provider did not return a model list from /models.");

  const models = new Map<string, DiscoveredModel>();
  for (const entry of entries) {
    const model = record(entry);
    const id = model.id ?? model.slug;
    if (typeof id !== "string" || !id.trim()) continue;
    const levels = Array.isArray(model.supported_reasoning_levels) ? model.supported_reasoning_levels : [];
    const efforts = levels.flatMap((level) => {
      const { effort, description } = record(level);
      return typeof effort === "string" && effort.trim()
        ? [{ value: effort, description: typeof description === "string" ? description : undefined }]
        : [];
    });
    const tiers = Array.isArray(model.service_tiers) ? model.service_tiers.map((tier) => record(tier).id) : [];
    models.set(id, {
      id,
      name: typeof model.display_name === "string" && model.display_name ? model.display_name : id,
      efforts: [...new Map(efforts.map((effort) => [effort.value, effort])).values()],
      defaultEffort: typeof model.default_reasoning_level === "string" ? model.default_reasoning_level : undefined,
      fastTier: tiers.includes("priority") ? "priority" : tiers.includes("fast") ? "fast" : undefined,
      hidden:
        model.visibility === "hide" ||
        (Array.isArray(model.input_modalities) && !model.input_modalities.includes("text")),
    });
  }
  return [...models.values()];
}

export async function discoverModels(configuration: ProviderConfiguration, signal?: AbortSignal) {
  const client = createProvider(configuration);
  const isOpenAI = /(^|\.)api\.openai\.com$/.test(new URL(client.baseURL).hostname);
  const response = await client.get<unknown>("/models", { signal }).catch((error: unknown) => {
    throw providerError(error, signal);
  });
  let models = readModels(response);
  if (!models.length)
    throw new Error("The provider returned no available models. Check your API key and provider setup.");

  // CLIProxyAPI exposes its capability catalog on the same endpoint in Codex client mode.
  // Keep the standard model list authoritative if a compatible provider ignores or rejects this optional query.
  if (!isOpenAI) {
    try {
      const response = await client.get<unknown>("/models", {
        query: { client_version: "cpa" },
        signal,
        timeout: 5_000,
      });
      if (Array.isArray(record(response).models)) {
        const metadata = new Map(readModels(response).map((model) => [model.id, model]));
        models = models.map((model) => metadata.get(model.id) ?? model);
      }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }

  models = models.filter((model) => !model.hidden);
  if (!models.length) throw new Error("The provider did not advertise any selectable text models.");
  return models
    .map((model) => ({ ...model, normalTier: isOpenAI ? ("default" as const) : undefined }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function modelOptions(model: DiscoveredModel, effort = "", mode: "normal" | "fast" = "normal") {
  const options: Record<string, string> = {};
  if (effort) {
    if (!model.efforts.some((level) => level.value === effort)) {
      throw new Error("Choose an effort advertised by the selected model.");
    }
    options.reasoning_effort = effort;
  }
  if (mode === "fast") {
    if (!model.fastTier) throw new Error("The selected model does not advertise Fast mode.");
    options.service_tier = model.fastTier;
  } else if (model.normalTier) {
    options.service_tier = model.normalTier;
  }
  return options;
}
