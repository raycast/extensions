import { LocalStorage } from "@raycast/api";

export type FavoriteState = {
  filters: string[];
  markets: string[];
  topics: string[];
};

const STORAGE_KEY = "kalshi-favorites";

const emptyFavorites: FavoriteState = {
  filters: [],
  markets: [],
  topics: [],
};

export async function getFavorites(): Promise<FavoriteState> {
  const value = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (!value) {
    return emptyFavorites;
  }

  try {
    return { ...emptyFavorites, ...JSON.parse(value) };
  } catch {
    return emptyFavorites;
  }
}

export async function saveFavorites(favorites: FavoriteState): Promise<void> {
  await LocalStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(normalizeFavorites(favorites)),
  );
}

export async function toggleFavorite(
  kind: keyof FavoriteState,
  value: string,
): Promise<FavoriteState> {
  const favorites = await getFavorites();
  const normalizedValue = normalizeValue(value);
  const values = new Set(favorites[kind].map(normalizeValue));

  if (values.has(normalizedValue)) {
    favorites[kind] = favorites[kind].filter(
      (item) => normalizeValue(item) !== normalizedValue,
    );
  } else {
    favorites[kind] = [...favorites[kind], value.trim()].filter(Boolean);
  }

  await saveFavorites(favorites);
  return favorites;
}

export function isFavorite(values: string[], value?: string): boolean {
  if (!value) {
    return false;
  }

  const normalizedValue = normalizeValue(value);
  return values.some((item) => normalizeValue(item) === normalizedValue);
}

export function parsePreferenceList(value?: string): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeFavorites(favorites: FavoriteState): FavoriteState {
  return {
    filters: unique(favorites.filters),
    markets: unique(favorites.markets),
    topics: unique(favorites.topics),
  };
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalizedValue = normalizeValue(value);

    if (!normalizedValue || seen.has(normalizedValue)) {
      continue;
    }

    seen.add(normalizedValue);
    result.push(value.trim());
  }

  return result;
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}
