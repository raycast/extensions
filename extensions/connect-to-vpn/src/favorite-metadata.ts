import { environment, LocalStorage } from "@raycast/api";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { lock } from "proper-lockfile";

const FAVORITES_KEY = "network-service-favorites";
const FAVORITES_ORDER_KEY = "network-service-favorites-order";

type FavoriteMetadata = {
  favorites: Record<string, boolean>;
  order: Record<string, number>;
};

type ServiceIdentity = { id: string; legacyId?: string };

function parseStoredRecord<T>(raw: string | undefined, isValue: (value: unknown) => value is T): Record<string, T> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, T] => isValue(entry[1])));
  } catch {
    return {};
  }
}

export const loadFavorites = async (): Promise<Record<string, boolean>> =>
  parseStoredRecord(
    await LocalStorage.getItem<string>(FAVORITES_KEY),
    (value): value is boolean => typeof value === "boolean",
  );

export const loadFavoriteOrder = async (): Promise<Record<string, number>> =>
  parseStoredRecord(
    await LocalStorage.getItem<string>(FAVORITES_ORDER_KEY),
    (value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0,
  );

/** All commands read, migrate, and edit the latest metadata under the same process-shared lock. */
export async function updateFavoriteMetadata(
  services: readonly ServiceIdentity[],
  change?: (metadata: FavoriteMetadata) => void,
): Promise<FavoriteMetadata> {
  await mkdir(environment.supportPath, { recursive: true });
  const release = await lock(join(environment.supportPath, "favorite-metadata"), {
    realpath: false,
    retries: { retries: 20, minTimeout: 25, maxTimeout: 100 },
  });
  try {
    const [favorites, order] = await Promise.all([loadFavorites(), loadFavoriteOrder()]);
    const previousFavorites = JSON.stringify(favorites);
    const previousOrder = JSON.stringify(order);
    let migrated = false;
    for (const { id, legacyId } of services) {
      if (!legacyId || !/^\d+$/.test(legacyId)) continue;
      if (Object.hasOwn(favorites, legacyId)) {
        favorites[id] ??= favorites[legacyId];
        delete favorites[legacyId];
        migrated = true;
      }
      if (Object.hasOwn(order, legacyId)) {
        order[id] ??= order[legacyId];
        delete order[legacyId];
        migrated = true;
      }
    }
    // Keep absent services, including unresolved legacy IDs, until they can be identified.
    const ids = Object.keys(favorites)
      .filter((id) => favorites[id])
      .sort((a, b) => (order[a] ?? 0) - (order[b] ?? 0));
    if (
      migrated ||
      ids.some((id) => order[id] === undefined) ||
      new Set(ids.map((id) => order[id])).size !== ids.length
    ) {
      ids.forEach((id, index) => {
        order[id] = index;
      });
    }
    const metadata = { favorites, order };
    change?.(metadata);
    if (JSON.stringify(favorites) !== previousFavorites)
      await LocalStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    if (JSON.stringify(order) !== previousOrder) await LocalStorage.setItem(FAVORITES_ORDER_KEY, JSON.stringify(order));
    return metadata;
  } finally {
    await release();
  }
}
