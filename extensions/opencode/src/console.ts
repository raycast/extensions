import { z } from "zod";

const CONFIG_URL = "https://opencode.ai/console/api/config";
const MANAGED_URL = "https://opencode.ai/inference/openai/v1";
const GO_PROVIDER = "opencode-go";

export type Format = "anthropic" | "openai" | "google" | "openai-compatible";
// Zen is the pay-as-you-go catalog; Go is the subscription, served from its own provider and endpoints.
export type Source = "zen" | "go";

const Model = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  temperature: z.boolean().optional(),
  tool_call: z.boolean().optional(),
  modalities: z.object({ input: z.array(z.string()) }).optional(),
  cost: z.object({ input: z.number(), output: z.number() }).optional(),
  limit: z.object({ context: z.number(), output: z.number().optional() }).optional(),
  provider: z.object({ npm: z.string().optional() }).optional(),
  disabled: z.boolean().optional(),
});

const Provider = z.object({
  npm: z.string(),
  api: z.string(),
  models: z.record(z.string(), Model).optional(),
});

const Config = z.object({ config: z.object({ provider: z.record(z.string(), Provider) }) });

export async function loadModels(apiKey: string) {
  const response = await fetch(CONFIG_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 || response.status === 403)
    throw new Error("OpenCode rejected the API key. Check the API Key in the extension preferences.");
  if (!response.ok) throw new Error(`Could not load OpenCode models (HTTP ${response.status}).`);
  const config = Config.parse(await response.json());
  // Only the managed OpenCode catalog and Go; custom connections come with their own providers in the config.
  return Object.entries(config.config.provider).flatMap(([key, provider]) => {
    const source: Source | undefined = key === GO_PROVIDER ? "go" : provider.api === MANAGED_URL ? "zen" : undefined;
    if (!source) return [];
    return Object.entries(provider.models ?? {})
      .filter(([, model]) => model.disabled !== true && !isFree(model))
      .map(([modelKey, model]) => ({
        id: model.id ?? modelKey,
        source,
        title: model.name ?? modelKey,
        price: model.cost,
        format: toFormat(model.provider?.npm ?? provider.npm),
        temperature: model.temperature !== false,
        tools: model.tool_call ?? false,
        vision: model.modalities?.input.includes("image") ?? false,
        contextWindow: model.limit?.context,
        outputLimit: model.limit?.output,
      }));
  });
}

// Free models only serve requests from OpenCode itself.
function isFree(model: z.infer<typeof Model>) {
  return model.cost !== undefined && model.cost.input === 0 && model.cost.output === 0;
}

function toFormat(npm: string): Format {
  if (npm === "@ai-sdk/anthropic") return "anthropic";
  if (npm === "@ai-sdk/openai") return "openai";
  if (npm === "@ai-sdk/google") return "google";
  return "openai-compatible";
}
