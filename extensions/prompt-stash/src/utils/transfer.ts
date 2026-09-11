import { Prompt } from "../types";

export const PROMPTS_KEY = "prompts";

export const EXPORT_SCHEMA = "prompt-stash-export";
export const EXPORT_VERSION = 1;

export interface PromptStashExport {
  $schema: typeof EXPORT_SCHEMA;
  version: number;
  exportedAt: string;
  count: number;
  prompts: Prompt[];
}

export function buildExport(prompts: Prompt[]): PromptStashExport {
  return {
    $schema: EXPORT_SCHEMA,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    count: prompts.length,
    prompts,
  };
}

/**
 * Parse and validate a Prompt Stash export file. Also accepts the legacy
 * "raw array" shape (the format directly written to LocalStorage), so that
 * users who manually rescue the previous storage value can still import it.
 */
export function parseExportFile(content: string): Prompt[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("File is not valid JSON");
  }

  if (Array.isArray(parsed)) {
    return collectValidPrompts(parsed);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid export file structure");
  }

  const obj = parsed as Partial<PromptStashExport>;
  if (obj.$schema !== EXPORT_SCHEMA) {
    throw new Error("Not a Prompt Stash export file");
  }
  if (typeof obj.version !== "number" || obj.version > EXPORT_VERSION) {
    throw new Error(`Unsupported export version: ${String(obj.version)}`);
  }
  if (!Array.isArray(obj.prompts)) {
    throw new Error("Export file is missing the prompts array");
  }

  return collectValidPrompts(obj.prompts);
}

function collectValidPrompts(value: unknown[]): Prompt[] {
  const result: Prompt[] = [];
  const seenIds = new Set<string>();
  for (const item of value) {
    if (isValidPrompt(item) && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      result.push({ ...item, createdAt: item.createdAt ?? new Date() });
    }
  }
  if (result.length === 0) {
    throw new Error("Export file does not contain any valid prompts");
  }
  return result;
}

function isValidPrompt(value: unknown): value is Omit<Prompt, "createdAt"> & { createdAt?: Prompt["createdAt"] } {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Prompt>;
  return (
    typeof p.id === "string" &&
    typeof p.title === "string" &&
    typeof p.content === "string" &&
    Array.isArray(p.tags) &&
    p.tags.every((tag) => typeof tag === "string") &&
    typeof p.isFavorite === "boolean"
  );
}
