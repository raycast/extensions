import { z } from "zod";

const CONFIG_URL = "https://opencode.ai/console/api/config";
const MANAGED_URL = "https://opencode.ai/inference/openai/v1";
const TOKEN_PLACEHOLDER = "{env:OPENCODE_CONSOLE_TOKEN}";

// Model families map to their lab's logo on models.dev; anything unmatched keeps the OpenCode logo.
const LABS = [
  ["claude", "anthropic"],
  ["gpt", "openai"],
  ["gemini", "google"],
  ["grok", "xai"],
  ["deepseek", "deepseek"],
  ["kimi", "moonshotai"],
  ["glm", "zai"],
  ["qwen", "alibaba"],
  ["minimax", "minimax"],
  ["mimo", "xiaomi"],
  ["nemotron", "nvidia"],
  ["muse", "meta"],
] as const;

const Model = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  family: z.string().optional(),
  temperature: z.boolean().optional(),
  tool_call: z.boolean().optional(),
  modalities: z.object({ input: z.array(z.string()) }).optional(),
  cost: z.object({ input: z.number(), output: z.number() }).optional(),
  limit: z.object({ context: z.number() }).optional(),
  provider: z.object({ npm: z.string().optional(), api: z.string().optional() }).optional(),
  disabled: z.boolean().optional(),
});

const Provider = z.object({
  npm: z.string(),
  api: z.string(),
  options: z.object({ headers: z.record(z.string(), z.string()).optional() }).optional(),
  models: z.record(z.string(), Model).optional(),
});

const Config = z.object({ config: z.object({ provider: z.record(z.string(), Provider) }) });

export type ConsoleModel = Awaited<ReturnType<typeof loadModels>>[number];

export async function loadModels(apiKey: string) {
  const response = await fetch(CONFIG_URL, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 || response.status === 403)
    throw new Error("OpenCode rejected the API key. Check the API Key in the extension preferences.");
  if (!response.ok) throw new Error(`Could not load OpenCode models (HTTP ${response.status}).`);
  const config = Config.parse(await response.json());
  // Only the managed OpenCode catalog; custom connections and Go come with their own providers in the config.
  return Object.values(config.config.provider)
    .filter((provider) => provider.api === MANAGED_URL)
    .flatMap((provider) =>
      Object.entries(provider.models ?? {})
        .filter(([, model]) => model.disabled !== true && !isFree(model))
        .map(([modelKey, model]) => ({
          id: modelKey,
          apiModelID: model.id ?? modelKey,
          title: model.name ?? modelKey,
          lab: LABS.find(([prefix]) => model.family?.startsWith(prefix))?.[1],
          price: model.cost,
          package: model.provider?.npm ?? provider.npm,
          baseURL: model.provider?.api ?? provider.api,
          headers: withToken(provider.options?.headers ?? {}, apiKey),
          temperature: model.temperature !== false,
          tools: model.tool_call ?? false,
          vision: model.modalities?.input.includes("image") ?? false,
          contextWindow: model.limit?.context,
        })),
    );
}

// Free models only serve requests from OpenCode itself.
function isFree(model: z.infer<typeof Model>) {
  return model.cost !== undefined && model.cost.input === 0 && model.cost.output === 0;
}

function withToken(values: Record<string, string>, apiKey: string) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.replaceAll(TOKEN_PLACEHOLDER, apiKey)]),
  );
}
