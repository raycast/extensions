import { Model } from "../type";
import { AuthProvider } from "./auth";

export const CHATGPT_CODEX_SUPPORTED_MODELS = [
  "gpt-5.3-codex",
  "gpt-5.3-codex-spark",
  "gpt-5.2-codex",
  "gpt-5.2",
  "gpt-5.1-codex-max",
  "gpt-5.1",
  "gpt-5.1-codex",
  "gpt-5-codex",
  "gpt-5-codex-mini",
  "gpt-5",
] as const;

export const MODEL_OPTION_LAST_IN_SELECTION = "chatgpt-4o-latest";

export const DEFAULT_CHATGPT_CODEX_MODEL = "gpt-5.2";

export function isChatGPTCodexModelSupported(model: string): boolean {
  const trimmed = model.trim();
  if (!trimmed) {
    return false;
  }

  return CHATGPT_CODEX_SUPPORTED_MODELS.some((supported) => {
    return trimmed === supported || trimmed.startsWith(`${supported}-`);
  });
}

export function resolveModelOptionForAuth(option: string, authProvider: AuthProvider): string {
  if (authProvider !== "chatgpt") {
    return option;
  }

  return isChatGPTCodexModelSupported(option) ? option : DEFAULT_CHATGPT_CODEX_MODEL;
}

export function mergeModelOptionsWithCodex(options: string[]): string[] {
  return orderModelOptionsForSelection(dedupe([...options, ...CHATGPT_CODEX_SUPPORTED_MODELS]));
}

export function filterModelsForAuth(models: Model[], authProvider: AuthProvider): Model[] {
  if (authProvider !== "chatgpt") {
    return models;
  }

  const supportedModels = models.filter((model) => isChatGPTCodexModelSupported(model.option));
  const hasDefaultModel = supportedModels.some((model) => model.id === "default");

  if (hasDefaultModel) {
    return orderModelsForSelection(supportedModels);
  }

  const sourceDefault = models.find((model) => model.id === "default");
  const fallbackDefault: Model =
    sourceDefault !== undefined
      ? {
          ...sourceDefault,
          option: DEFAULT_CHATGPT_CODEX_MODEL,
          updated_at: new Date().toISOString(),
        }
      : {
          id: "default",
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          name: "Default",
          prompt: "You are a helpful assistant.",
          option: DEFAULT_CHATGPT_CODEX_MODEL,
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
