import { generateId, normalizeLayer } from "./schema";
import type { Layer } from "./types";

export function layersToJson(layers: Layer[]): string {
  return JSON.stringify(
    layers.map((layer) => ({
      ...layer,
      entries: layer.entries.map((entry) => ({
        key: entry.key,
        title: entry.title,
        kind: entry.kind,
        value: entry.value,
        icon: entry.icon,
      })),
    })),
    null,
    2
  );
}

export function exportFileName(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `shortcut-layers-${stamp}.json`;
}

/**
 * Accepts a single layer object or an array. Throws when a layer has no name,
 * two layers share an id, or an action has no key or repeats a key in its layer.
 */
export function parseLayersJson(text: string): Layer[] {
  const parsed: unknown = JSON.parse(text);
  const source = Array.isArray(parsed) ? parsed : [parsed];
  if (source.length === 0) {
    throw new Error("No layers found in JSON");
  }

  const errors: string[] = [];
  const seenLayerIds = new Map<string, number>();
  const layers: Layer[] = [];

  source.forEach((entry, index) => {
    const row = index + 1;
    const src = (typeof entry === "object" && entry !== null ? entry : {}) as Record<string, unknown>;
    if (typeof src.name !== "string" || src.name.trim().length === 0) {
      errors.push(`Row ${row}: layer is missing a name`);
      return;
    }

    const layer = normalizeLayer(src);
    // Fresh internal ids: the file's ids are untrusted and may repeat.
    layer.entries = layer.entries.map((item) => ({ ...item, id: generateId() }));
    const previousRow = seenLayerIds.get(layer.id);
    if (previousRow !== undefined) {
      errors.push(`Rows ${previousRow} and ${row}: duplicate layer id "${layer.id}"`);
      return;
    }
    seenLayerIds.set(layer.id, row);

    const seenKeys = new Map<string, number>();
    layer.entries.forEach((item, entryIndex) => {
      const position = entryIndex + 1;
      if (!item.key) {
        errors.push(`Layer "${layer.name}": action ${position} ("${item.title || "untitled"}") has no key`);
        return;
      }
      const prior = seenKeys.get(item.key);
      if (prior !== undefined) {
        errors.push(`Layer "${layer.name}": duplicate key "${item.key}" (actions ${prior} and ${position})`);
        return;
      }
      seenKeys.set(item.key, position);
    });

    layers.push(layer);
  });

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  return layers;
}

export interface MergeResult {
  layers: Layer[];
  /** Layers that did not exist before. */
  added: number;
  /** Existing layers that gained at least one new action. */
  updated: number;
  addedEntries: number;
  /** Incoming actions skipped because their key was already used in that layer. */
  skippedEntries: number;
}

/**
 * Merges by layer id, then by action key. New layers are appended; for an
 * existing layer, only actions whose key is not already used are added. Existing
 * actions are never overwritten or removed.
 */
export function mergeLayers(existing: Layer[], incoming: Layer[]): MergeResult {
  const layers = existing.map((layer) => ({ ...layer, entries: [...layer.entries] }));
  let added = 0;
  let updated = 0;
  let addedEntries = 0;
  let skippedEntries = 0;

  for (const layer of incoming) {
    const index = layers.findIndex((l) => l.id === layer.id);
    if (index < 0) {
      layers.push(layer);
      added++;
      addedEntries += layer.entries.length;
      continue;
    }

    const current = layers[index];
    const keys = new Set(current.entries.map((entry) => entry.key).filter(Boolean));
    let gained = 0;
    for (const entry of layer.entries) {
      if (!entry.key || keys.has(entry.key)) {
        skippedEntries++;
        continue;
      }
      keys.add(entry.key);
      current.entries.push(entry);
      gained++;
    }
    addedEntries += gained;
    if (gained > 0) updated++;
  }

  return { layers, added, updated, addedEntries, skippedEntries };
}
