import { Model } from "../type";
import { AuthProvider } from "./auth";

export const CHATGPT_CODEX_SUPPORTED_MODELS = [
  "gpt-5.4",
  "gpt-5.2-codex",
  "gpt-5.1-codex-max",
  "gpt-5.4-mini",
  "gpt-5.3-codex",
  "gpt-5.2",
  "gpt-5.1-codex-mini",
] as const;

export const MODEL_OPTION_LAST_IN_SELECTION = "chatgpt-4o-latest";

export const DEFAULT_CHATGPT_CODEX_MODEL = "gpt-5.4-mini";

export function resolveModelOptionForAuth(
  option: string,
  authProvider: AuthProvider,
  availableOptions?: string[],
): string {
  const normalizedOptions = normalizeAvailableOptions(availableOptions);
  if (normalizedOptions.length === 0) {
    const trimmed = option.trim();
    return isChatGPTCodexModelSupported(trimmed) ? trimmed : DEFAULT_CHATGPT_CODEX_MODEL;
  }

  const trimmed = option.trim();
  return normalizedOptions.includes(trimmed) ? trimmed : normalizedOptions[0];
}

export function filterModelsForAuth(models: Model[], authProvider: AuthProvider, availableOptions?: string[]): Model[] {
  const normalizedOptions = normalizeAvailableOptions(availableOptions);
  if (normalizedOptions.length === 0) {
    return orderModelsForSelection(
      models.filter((model) => isChatGPTCodexModelSupported(model.option) || model.id === "default"),
    );
  }

  const supportedModels = models.filter((model) => normalizedOptions.includes(model.option.trim()));
  const hasDefaultModel = supportedModels.some((model) => model.id === "default");

  if (hasDefaultModel) {
    return orderModelsForSelection(supportedModels);
  }

  const sourceDefault = models.find((model) => model.id === "default");
  const fallbackDefault: Model =
    sourceDefault !== undefined
      ? {
          ...sourceDefault,
          option: normalizedOptions[0],
          updated_at: new Date().toISOString(),
        }
      : {
          id: "default",
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          name: "Default",
          prompt: "You are a helpful assistant.",
          option: normalizedOptions[0],
          temperature: "1",
          enableReasoningEffortChange: false,
          reasoningEffort: "medium",
          pinned: false,
          vision: false,
        };

  return orderModelsForSelection([fallbackDefault, ...supportedModels]);
}

export function orderModelOptionsForSelection(options: string[]): string[] {
  return moveLast(options, (option) => option.trim() === MODEL_OPTION_LAST_IN_SELECTION);
}

export function orderModelsForSelection(models: Model[]): Model[] {
  return moveLast(models, (model) => model.option.trim() === MODEL_OPTION_LAST_IN_SELECTION);
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
  }

  return result;
}

function normalizeAvailableOptions(availableOptions?: string[]): string[] {
  return dedupe(availableOptions ?? [...CHATGPT_CODEX_SUPPORTED_MODELS]);
}

export function isChatGPTCodexModelSupported(model: string): boolean {
  return CHATGPT_CODEX_SUPPORTED_MODELS.includes(model.trim() as (typeof CHATGPT_CODEX_SUPPORTED_MODELS)[number]);
}

function moveLast<T>(items: T[], shouldBeLast: (item: T) => boolean): T[] {
  const regular: T[] = [];
  const last: T[] = [];

  for (const item of items) {
    if (shouldBeLast(item)) {
      last.push(item);
    } else {
      regular.push(item);
    }
  }

  return [...regular, ...last];
}
