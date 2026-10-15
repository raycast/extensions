import { environment, LocalStorage } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { lock } from "proper-lockfile";

const FAVORITES_KEY = "network-service-favorites";
const FAVORITES_ORDER_KEY = "network-service-favorites-order";
const FAVORITE_METADATA_KEY = "network-service-favorite-metadata";

type FavoriteMetadata = {
  favorites: Record<string, boolean>;
  order: Record<string, number>;
};

function parseStoredValue(raw: string | undefined): unknown {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function parseRecord<T>(value: unknown, isValue: (value: unknown) => value is T): Record<string, T> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, T] => isValue(entry[1])));
}

const isFavorite = (value: unknown): value is boolean => typeof value === "boolean";
const isPosition = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

async function loadFavoriteMetadata(): Promise<FavoriteMetadata> {
  const raw = await LocalStorage.getItem<string>(FAVORITE_METADATA_KEY);
  if (raw !== undefined) {
    const value = parseStoredValue(raw);
    // Once imported, the snapshot is authoritative. Do not revive stale legacy edits if it is malformed.
    if (typeof value !== "object" || value === null || Array.isArray(value)) return { favorites: {}, order: {} };
    return {
      favorites: parseRecord("favorites" in value ? value.favorites : undefined, isFavorite),
      order: parseRecord("order" in value ? value.order : undefined, isPosition),
    };
  }
  const [favorites, order] = await Promise.all([
    LocalStorage.getItem<string>(FAVORITES_KEY),
    LocalStorage.getItem<string>(FAVORITES_ORDER_KEY),
  ]);
  return {
    favorites: parseRecord(parseStoredValue(favorites), isFavorite),
    order: parseRecord(parseStoredValue(order), isPosition),
  };
}

export const loadFavorites = async (): Promise<Record<string, boolean>> => (await loadFavoriteMetadata()).favorites;
export const loadFavoriteOrder = async (): Promise<Record<string, number>> => (await loadFavoriteMetadata()).order;

/** Import and repair in memory; reading never changes saved favorites. */
export async function readFavoriteMetadata(): Promise<FavoriteMetadata> {
  const metadata = await loadFavoriteMetadata();
  const { favorites, order } = metadata;
  // Numeric network positions contain no owner identity. Retain them unchanged, but never
  // assign them to the service currently in that slot, even if the original VPN returns.
  const ids = Object.keys(favorites)
    .filter((id) => favorites[id] && !/^\d+$/.test(id))
    .sort((a, b) => (order[a] ?? Infinity) - (order[b] ?? Infinity));
  // Keep absent named favorites in their manual order. A historical partial save can leave
  // favorites without positions; append those after every favorite with a known position.
  if (ids.some((id) => order[id] === undefined) || new Set(ids.map((id) => order[id])).size !== ids.length) {
    ids.forEach((id, index) => {
      order[id] = index;
    });
  }
  return metadata;
}

// Only explicit list edits acquire the cross-worker guard. Discovery and metadata reads
// never wait for it, and never write migration or repair results back to storage.
export async function updateFavoriteMetadata(change: (metadata: FavoriteMetadata) => void): Promise<FavoriteMetadata> {
  await mkdir(environment.supportPath, { recursive: true });
  const release = await lock(join(environment.supportPath, "favorite-metadata"), {
    realpath: false,
    retries: { retries: 20, minTimeout: 25, maxTimeout: 100 },
  });
  try {
    const metadata = await readFavoriteMetadata();
    const previous = JSON.stringify(metadata);
    change(metadata);
    const next = JSON.stringify(metadata);
    if (next !== previous) await LocalStorage.setItem(FAVORITE_METADATA_KEY, next);
    return metadata;
  } finally {
    // Cleanup cannot undo a committed snapshot or replace the original save error.
    await release().catch((err: unknown) => console.error("Unable to release favorites save lock:", err));
  }
}
