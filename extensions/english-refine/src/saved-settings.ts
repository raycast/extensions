import type { DiscoveredModel } from "./models";

export function restoreSettings(models: DiscoveredModel[], stored?: string, requireSavedModel = false) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored ?? "{}");
  } catch {
    // Previous versions stored just the model ID in this key.
  }
  const saved =
    parsed !== null && typeof parsed === "object" ? (parsed as Record<string, unknown>) : { modelId: stored };
  const savedModel = models.find((model) => model.id === saved.modelId);
  if (requireSavedModel && !savedModel) throw new Error("Choose an available model in Refine Settings first.");
  const model = savedModel ?? models[0];
  if (!model) throw new Error("No available models.");
  const sameModel = model.id === saved.modelId;
  return {
    model,
    effort:
      sameModel && typeof saved.effort === "string" && model.efforts.some((level) => level.value === saved.effort)
        ? saved.effort
        : "",
    mode: sameModel && saved.mode === "fast" && model.fastTier ? ("fast" as const) : ("normal" as const),
  };
}

export function settingsKey(baseUrl: string) {
  return `model:${baseUrl.trim().replace(/\/+$/, "")}`;
}
