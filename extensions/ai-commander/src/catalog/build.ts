import type { CatalogEntry, ModelRef, ProviderId, RawModel } from "../core/types";
import { cleanDisplayName, deriveFamily, familyRank } from "./families";
import { isModelIncluded } from "./filters";

export type RawByProvider = Partial<Record<ProviderId, readonly RawModel[]>>;

export const PROVIDER_IDS: readonly ProviderId[] = ["anthropic", "openai", "gemini", "openrouter"];

export const FAVORITES_TITLE = "Favorites";

export interface CatalogGroup {
  title: string;
  entries: CatalogEntry[];
  isFavorites: boolean;
}

export function refKey(ref: ModelRef): string {
  return `${ref.provider}:${ref.modelId}`;
}

function toEntry(provider: ProviderId, raw: RawModel): CatalogEntry {
  const entry: CatalogEntry = {
    ref: { provider, modelId: raw.id },
    displayName: cleanDisplayName(raw.id, raw.name),
    family: deriveFamily(provider, raw.id),
  };
  // Optional fields are copied only when present so the cached JSON stays small and free of undefined keys.
  if (raw.supportsReasoning !== undefined) entry.supportsReasoning = raw.supportsReasoning;
  if (raw.supportsTemperature !== undefined) entry.supportsTemperature = raw.supportsTemperature;
  if (raw.pricing !== undefined) entry.pricing = raw.pricing;
  if (raw.contextLength !== undefined) entry.contextLength = raw.contextLength;
  if (raw.maxOutputTokens !== undefined) entry.maxOutputTokens = raw.maxOutputTokens;
  return entry;
}

function compareEntries(a: CatalogEntry, b: CatalogEntry): number {
  return (
    familyRank(a.family) - familyRank(b.family) ||
    a.family.localeCompare(b.family) ||
    a.displayName.localeCompare(b.displayName, "en", { numeric: true, sensitivity: "base" }) ||
    refKey(a.ref).localeCompare(refKey(b.ref))
  );
}

/**
 * Merges fresh provider listings into the catalog. A provider present in `rawByProvider` replaces its previous
 * entries; a provider absent from it (failed, not due, or no key) keeps whatever `previous` holds. The result is
 * filtered, deduplicated by provider and model ID, and sorted deterministically.
 */
export function buildCatalog(rawByProvider: RawByProvider, previous: readonly CatalogEntry[] = []): CatalogEntry[] {
  const byKey = new Map<string, CatalogEntry>();
  for (const entry of previous) {
    if (rawByProvider[entry.ref.provider] === undefined) byKey.set(refKey(entry.ref), entry);
  }
  for (const provider of PROVIDER_IDS) {
    for (const raw of rawByProvider[provider] ?? []) {
      if (raw.id === "" || !isModelIncluded(provider, raw.id)) continue;
      const key = `${provider}:${raw.id}`;
      // First listing wins; providers occasionally repeat an ID.
      if (!byKey.has(key)) byKey.set(key, toEntry(provider, raw));
    }
  }
  return [...byKey.values()].sort(compareEntries);
}

/**
 * Groups entries for the dropdown. Favorites come first, in the user's order. They are removed from their family
 * group because dropdown item values must be unique.
 */
export function groupByFamily(entries: readonly CatalogEntry[], favorites: readonly ModelRef[] = []): CatalogGroup[] {
  const byKey = new Map(entries.map((entry) => [refKey(entry.ref), entry]));
  const favoriteEntries: CatalogEntry[] = [];
  const favoriteKeys = new Set<string>();
  for (const favorite of favorites) {
    const key = refKey(favorite);
    const entry = byKey.get(key);
    if (entry !== undefined && !favoriteKeys.has(key)) {
      favoriteKeys.add(key);
      favoriteEntries.push(entry);
    }
  }

  const groups: CatalogGroup[] = [];
  if (favoriteEntries.length > 0) groups.push({ title: FAVORITES_TITLE, entries: favoriteEntries, isFavorites: true });

  const families = new Map<string, CatalogEntry[]>();
  for (const entry of entries) {
    if (favoriteKeys.has(refKey(entry.ref))) continue;
    const list = families.get(entry.family) ?? [];
    list.push(entry);
    families.set(entry.family, list);
  }
  const titles = [...families.keys()].sort((a, b) => familyRank(a) - familyRank(b) || a.localeCompare(b));
  for (const title of titles) groups.push({ title, entries: families.get(title) ?? [], isFavorites: false });
  return groups;
}

export function findEntry(entries: readonly CatalogEntry[], ref: ModelRef): CatalogEntry | undefined {
  return entries.find((entry) => entry.ref.provider === ref.provider && entry.ref.modelId === ref.modelId);
}

/** Parses the free input `provider:model-id`. Model IDs may contain colons (":free"), so only the first splits. */
export function parseCustomModel(input: string): ModelRef | undefined {
  const text = input.trim();
  const index = text.indexOf(":");
  if (index <= 0) return undefined;
  const provider = text.slice(0, index).trim().toLowerCase();
  const modelId = text.slice(index + 1).trim();
  const known = PROVIDER_IDS.find((id) => id === provider);
  if (known === undefined || modelId === "" || /\s/.test(modelId)) return undefined;
  return { provider: known, modelId };
}

/**
 * True when the catalog positively lacks the model. If the provider has no entries at all (no key, never loaded,
 * load failed) nothing can be said about the model, so it is not reported as missing; the UI shows the key problem.
 */
export function isModelMissing(entries: readonly CatalogEntry[], ref: ModelRef): boolean {
  if (!entries.some((entry) => entry.ref.provider === ref.provider)) return false;
  return findEntry(entries, ref) === undefined;
}
