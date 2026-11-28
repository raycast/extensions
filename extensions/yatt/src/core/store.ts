import type { Location } from "./types";

/** Where the location list lives: Raycast LocalStorage or a JSON file. Implemented in src/lib/storage.ts. */
export interface StorageBackend {
  read(): Promise<string | undefined>;
  write(text: string): Promise<void>;
  /** Read-modify-write as one step, under a lock where the backend has one. Optional: `read` + `write` otherwise. */
  update?(fn: (text: string | undefined) => string): Promise<void>;
}

export type LocationsFile = { version: 1; locations: Location[]; lastAnchor?: string };

/** Drops duplicates (by id), lower-cases and de-duplicates aliases, guarantees one home at most. */
export function normalizeLocations(list: Location[]): Location[] {
  const seen = new Set<string>();
  const out: Location[] = [];
  let home = false;
  for (const raw of list) {
    if (!raw || typeof raw.id !== "string" || typeof raw.tz !== "string" || seen.has(raw.id)) continue;
    seen.add(raw.id);
    const l: Location = {
      ...raw,
      kind: raw.kind === "zone" ? "zone" : "city",
      label: String(raw.label ?? raw.tz),
      aliases: [...new Set((raw.aliases ?? []).map((a) => String(a).trim().toLowerCase()).filter(Boolean))],
    };
    if (l.isHome) {
      if (home) l.isHome = false;
      home = true;
    }
    out.push(l);
  }
  return out;
}

export function parseLocationsFile(text: string | undefined): LocationsFile | undefined {
  if (!text) return undefined;
  try {
    const j = JSON.parse(text) as Partial<LocationsFile> | Location[];
    if (Array.isArray(j)) return { version: 1, locations: normalizeLocations(j) };
    if (j && Array.isArray(j.locations))
      return { version: 1, locations: normalizeLocations(j.locations), lastAnchor: j.lastAnchor };
  } catch {
    /* fall through */
  }
  return undefined;
}

export function serializeLocationsFile(file: LocationsFile): string {
  return JSON.stringify(file, null, 2) + "\n";
}

/**
 * Reads the list. A missing or empty store is seeded; a store that exists but cannot be parsed throws, so a
 * damaged file is reported rather than replaced.
 */
export async function loadLocationsFile(backend: StorageBackend, seed: Location[]): Promise<LocationsFile> {
  const current = currentOrSeed(await backend.read(), seed);
  if (!current.seeded) return current.file;
  // Seed under the lock, re-reading inside it: another command may have seeded or written meanwhile.
  return updateLocationsFile(backend, seed, () => ({}));
}

/** The stored file, or a seeded one when the store is missing or empty. Throws when the store is damaged. */
function currentOrSeed(text: string | undefined, seed: Location[]): { file: LocationsFile; seeded: boolean } {
  if (text !== undefined && text.trim() !== "") {
    const parsed = parseLocationsFile(text);
    if (!parsed) throw new Error("The locations file is not valid locations JSON; fix or remove it.");
    return { file: parsed, seeded: false };
  }
  return { file: { version: 1, locations: normalizeLocations(seed) }, seeded: true };
}

/**
 * Applies a change to the stored file and returns the result. Reading and writing happen inside the backend's
 * `update` when it has one, so a change made by another process between the two is never overwritten.
 */
export async function updateLocationsFile(
  backend: StorageBackend,
  seed: Location[],
  change: (current: LocationsFile) => Partial<LocationsFile>,
): Promise<LocationsFile> {
  let result: LocationsFile | undefined;
  const apply = (text: string | undefined) => {
    const current = currentOrSeed(text, seed).file;
    const merged = { ...current, ...change(current) };
    result = { ...merged, locations: normalizeLocations(merged.locations) };
    return serializeLocationsFile(result);
  };
  if (backend.update) await backend.update(apply);
  else await backend.write(apply(await backend.read()));
  return result!;
}

export async function saveLocationsFile(backend: StorageBackend, file: LocationsFile): Promise<void> {
  await backend.write(serializeLocationsFile({ ...file, locations: normalizeLocations(file.locations) }));
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length || to < 0 || to >= list.length || from === to) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}
