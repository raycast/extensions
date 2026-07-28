import type { ModelInfo } from "./api";

export interface ModelGroup {
  provider: string;
  models: ModelInfo[];
}

function titleProvider(value: string): string {
  const normalized = value.trim().toLowerCase();
  const known: Record<string, string> = {
    anthropic: "Anthropic",
    claude: "Anthropic",
    deepseek: "DeepSeek",
    google: "Google",
    gemini: "Google",
    openai: "OpenAI",
    meta: "Meta",
    mistral: "Mistral",
    qwen: "Qwen",
  };
  return (
    known[normalized] ??
    value
      .trim()
      .split(/[\s_-]+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function modelProvider(model: ModelInfo): string {
  if (model.owned_by && model.owned_by !== "system") {
    return titleProvider(model.owned_by);
  }
  const id = model.id.toLowerCase();
  if (id.includes("claude")) return "Anthropic";
  if (id.includes("deepseek")) return "DeepSeek";
  if (id.includes("gemini")) return "Google";
  if (/^(gpt|o[1345]-|chatgpt)/.test(id)) return "OpenAI";
  if (id.includes("llama")) return "Meta";
  if (id.includes("mistral") || id.includes("mixtral")) return "Mistral";
  if (id.includes("qwen")) return "Qwen";
  return "Other";
}

export function normalizeModels(models: ModelInfo[]): ModelInfo[] {
  const byID = new Map<string, ModelInfo>();
  for (const model of models) {
    const id = model.id?.trim();
    if (!id || byID.has(id)) continue;
    byID.set(id, { ...model, id });
  }
  return [...byID.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function groupModels(models: ModelInfo[]): ModelGroup[] {
  const groups = new Map<string, ModelInfo[]>();
  for (const model of models) {
    const provider = modelProvider(model);
    const rows = groups.get(provider) ?? [];
    rows.push(model);
    groups.set(provider, rows);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([provider, rows]) => ({ provider, models: rows }));
}

export function resolveDefaultModel(
  models: ModelInfo[],
  configured?: string,
): string {
  if (configured && models.some((model) => model.id === configured)) {
    return configured;
  }
  return models[0]?.id ?? "";
}
