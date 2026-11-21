import type { Model, ReasoningEffort } from "../type";

export const REASONING_EFFORTS: readonly ReasoningEffort[] = ["none", "minimal", "low", "medium", "high", "xhigh"];

export function parseReasoningEffort(value: unknown): ReasoningEffort | undefined {
  return REASONING_EFFORTS.includes(value as ReasoningEffort) ? (value as ReasoningEffort) : undefined;
}

type ReasoningSettings = Pick<Model, "enableReasoningEffortChange" | "reasoningEffort">;

/**
 * The effort sent with a chat request: a model-level override wins, otherwise the global
 * preference applies. `undefined` means `reasoning_effort` is omitted (disabled).
 */
export function resolveReasoningEffort(
  model: ReasoningSettings,
  globalReasoningEffort: unknown,
): ReasoningEffort | undefined {
  const effort = model.enableReasoningEffortChange
    ? model.reasoningEffort
    : (parseReasoningEffort(globalReasoningEffort) ?? "none");
  return effort === "none" ? undefined : effort;
}

/** Short label for the model list, including whether the effort comes from the global setting. */
export function reasoningEffortLabel(model: ReasoningSettings, globalReasoningEffort: unknown): string {
  if (model.enableReasoningEffortChange) {
    return model.reasoningEffort;
  }
  return `global: ${parseReasoningEffort(globalReasoningEffort) ?? "none"}`;
}
