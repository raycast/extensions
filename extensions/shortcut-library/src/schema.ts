import { UNCATEGORIZED } from "./types";
import type { Shortcut } from "./types";

export function generateId(): string {
  return crypto.randomUUID();
}

export function normalizeShortcut(value: unknown): Shortcut {
  const src = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;

  const title = typeof src.title === "string" ? src.title.trim() : "";
  const keys = typeof src.keys === "string" ? src.keys.trim() : "";

  const tags = Array.isArray(src.tags)
    ? src.tags.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    : [];

  return {
    id: typeof src.id === "string" && src.id.length > 0 ? src.id : generateId(),
    category: typeof src.category === "string" && src.category.trim().length > 0 ? src.category.trim() : UNCATEGORIZED,
    title,
    keys,
    tags: tags.length > 0 ? tags : undefined,
    source: src.source === "discover" ? "discover" : undefined,
    sourceFile: typeof src.sourceFile === "string" && src.sourceFile.length > 0 ? src.sourceFile : undefined,
  };
}

export function validateShortcut(value: unknown): string | undefined {
  const src = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  if (typeof src.title !== "string" || src.title.trim().length === 0) return "Title is required";
  if (typeof src.keys !== "string" || src.keys.trim().length === 0) return "Keys are required";
  return undefined;
}

export function parseJsonImport(text: string): Shortcut[] {
  const parsed = JSON.parse(text) as unknown;

  const source = Array.isArray(parsed) ? parsed : [parsed];
  if (source.length === 0) return [];

  const errors: string[] = [];
  const items: Shortcut[] = [];

  source.forEach((entry, i) => {
    const error = validateShortcut(entry);
    if (error) {
      errors.push(`Row ${i + 1}: ${error}`);
      return;
    }
    items.push({ ...normalizeShortcut(entry), id: generateId() });
  });

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return items;
}

export function distinctCategories(items: Shortcut[]): string[] {
  const seen = new Set<string>();
  for (const item of items) if (item.category && item.category !== UNCATEGORIZED) seen.add(item.category);
  return [...seen].sort();
}

export interface MergeResult {
  added: Shortcut[];
  skipped: number;
}

function normalizeKeyPart(v: string): string {
  return v.toLowerCase().replace(/\s+/g, " ").trim();
}

export function isDuplicate(candidate: Shortcut, existing: Shortcut[]): boolean {
  const title = normalizeKeyPart(candidate.title);
  const keys = normalizeKeyPart(candidate.keys);
  return existing.some((e) => normalizeKeyPart(e.title) === title && normalizeKeyPart(e.keys) === keys);
}

export function mergeShortcuts(existing: Shortcut[], incoming: Shortcut[]): MergeResult {
  let skipped = 0;
  const added: Shortcut[] = [];
  for (const item of incoming) {
    if (isDuplicate(item, existing) || isDuplicate(item, added)) {
      skipped++;
      continue;
    }
    added.push(item);
  }
  return { added, skipped };
}
