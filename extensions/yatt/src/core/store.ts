import type { Location } from "./types";

/** Where the location list lives: Raycast LocalStorage or a JSON file. Implemented in src/lib/storage.ts. */
export interface StorageBackend {
  read(): Promise<string | undefined>;
  write(text: string): Promise<void>;
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
  const text = await backend.read();
  if (text !== undefined && text.trim() !== "") {
    const parsed = parseLocationsFile(text);
    if (!parsed) throw new Error("The locations file is not valid locations JSON; fix or remove it.");
    return parsed;
  }
  const file: LocationsFile = { version: 1, locations: normalizeLocations(seed) };
  await backend.write(serializeLocationsFile(file));
  return file;
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
