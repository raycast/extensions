import { ENTRY_KINDS } from "./types";
import type { Entry, EntryKind, Layer } from "./types";

export function generateId(): string {
  return crypto.randomUUID();
}

export function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "layer";
}

/**
 * An existing layer that would collide with `name`, either by the same name
 * (case-insensitive) or by the same derived id. Pass `ignoreId` when editing.
 */
export function findLayerClash(layers: Layer[], name: string, ignoreId?: string): Layer | undefined {
  const id = slugify(name);
  const lower = name.trim().toLowerCase();
  return layers.find(
    (layer) => layer.id !== ignoreId && (layer.id === id || layer.name.trim().toLowerCase() === lower)
  );
}

/** Single key, one Unicode code point. Case-sensitive, so "a" and "A" differ. */
export function normalizeKey(value: unknown): string {
  if (typeof value !== "string") return "";
  return [...value.trim()][0] ?? "";
}

function normalizeKind(value: unknown): EntryKind {
  return ENTRY_KINDS.includes(value as EntryKind) ? (value as EntryKind) : "url";
}

function normalizeKeywords(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value.filter((k): k is string => typeof k === "string" && k.trim().length > 0);
  return list.length > 0 ? list : undefined;
}

export function normalizeEntry(value: unknown): Entry {
  const src = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const kind = normalizeKind(src.kind);
  const rawValue = typeof src.value === "string" ? src.value : "";
  return {
    id: typeof src.id === "string" && src.id.length > 0 ? src.id : generateId(),
    key: normalizeKey(src.key),
    title: typeof src.title === "string" ? src.title.trim() : "",
    kind,
    // File paths are opaque: a trailing space is part of the name.
    value: kind === "file" ? rawValue : rawValue.trim(),
    keywords: normalizeKeywords(src.keywords),
  };
}

export function normalizeLayer(value: unknown): Layer {
  const src = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const name = typeof src.name === "string" && src.name.trim().length > 0 ? src.name.trim() : "Untitled Layer";
  return {
    id: typeof src.id === "string" && src.id.length > 0 ? src.id : slugify(name),
    name,
    icon: typeof src.icon === "string" && src.icon.length > 0 ? src.icon : undefined,
    color: typeof src.color === "string" && src.color.length > 0 ? src.color : undefined,
    entries: Array.isArray(src.entries) ? src.entries.map(normalizeEntry) : [],
  };
}

/** Keys used by more than one entry in the layer. */
export function duplicateKeys(entries: Entry[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const entry of entries) {
    if (!entry.key) continue;
    if (seen.has(entry.key)) dupes.add(entry.key);
    else seen.add(entry.key);
  }
  return [...dupes];
}

export function findEntry(entries: Entry[], key: string): Entry | undefined {
  const wanted = normalizeKey(key);
  return entries.find((entry) => entry.key === wanted);
}

/** Prefills a Quicklink name like "Obsidian Layer", unless the name already says "layer". */
export function quicklinkName(layerName: string): string {
  const name = layerName.trim();
  return /\blayers?\b/i.test(name) ? name : `${name} Layer`;
}

export const DEFAULT_KEY_COLOR = "#d0d0d0";

/** Optional per-layer colors for the key tag. Unset falls back to DEFAULT_KEY_COLOR. */
export const KEY_COLORS: { title: string; value: string }[] = [
  { title: "Pink", value: "#f6c6d0" },
  { title: "Peach", value: "#f9d3a3" },
  { title: "Amber", value: "#f8e0a0" },
  { title: "Yellow", value: "#ece6a5" },
  { title: "Lime", value: "#d3e6a5" },
  { title: "Green", value: "#b5e0b5" },
  { title: "Mint", value: "#a8e6cf" },
  { title: "Teal", value: "#9fdcd6" },
  { title: "Sky", value: "#a3d5e8" },
  { title: "Blue", value: "#a9cfec" },
  { title: "Indigo", value: "#b9c6f0" },
  { title: "Purple", value: "#d6c3ec" },
  { title: "Violet", value: "#e0c6f2" },
  { title: "Magenta", value: "#f0b9d9" },
  { title: "Coral", value: "#f2b8b0" },
  { title: "Tan", value: "#dcc5ad" },
];
