import { LocalStorage } from "@raycast/api";
import { Feature, QuayLineFavorites } from "./types";

enum StorageKeys {
  savedFeatures = "@PublicTransport/SavedFeatures/v1",
  savedQuayLines = "@PublicTransport/SavedQuayLines/v1",

  /**
   * @deprecated Use savedFeatures instead
   */
  preferredFeatures = "@PublicTransport/PreferredFeatures/v1",
}

export async function addFavoriteStop(venue: Feature): Promise<Feature[]> {
  const favorites = await loadFavoriteStops();
  const deDupedFavorites = favorites?.filter((f) => f.properties.id !== venue.properties.id);
  const newFavorites = deDupedFavorites ? [venue, ...deDupedFavorites] : [venue];
  await LocalStorage.setItem(StorageKeys.savedFeatures, JSON.stringify(newFavorites));
  return newFavorites;
}
export async function removeFavoriteStop(venue: Feature): Promise<Feature[]> {
  const favorites = await loadFavoriteStops();
  if (!favorites) return [];
  const newFavorites = favorites.filter((f) => f.properties.id !== venue.properties.id);
  await LocalStorage.setItem(StorageKeys.savedFeatures, JSON.stringify(newFavorites));
  return newFavorites;
}
export async function loadFavoriteStops(): Promise<Feature[] | undefined> {
  const favorites = await LocalStorage.getItem<string>(StorageKeys.savedFeatures);
  if (!favorites) return undefined;
  return JSON.parse(favorites) as Feature[];
}

export async function addFavoriteLines(
  lineId: string,
  quayId: string,
  stopPlaceId: string,
): Promise<QuayLineFavorites[]> {
  const favorites = await loadFavoriteLines();

  let newFavorites: QuayLineFavorites[] = [];
  if (!favorites) {
    // No favorites yet
    newFavorites = [{ quayId, stopPlaceId, lineIds: [lineId] }];
  } else if (favorites.some((fQuay) => fQuay.quayId === quayId)) {
    // Quay already in favorites
    newFavorites = favorites.map((fQuay) => {
      if (fQuay.quayId === quayId) {
        // Ignore if line is already in favorites
        if (fQuay.lineIds.includes(lineId)) return fQuay;
        // Add line to favorites
        return { ...fQuay, lineIds: [...fQuay.lineIds, lineId] };
      }
      return fQuay;
    });
  } else {
    // Quay not in favorites
    newFavorites = [...favorites, { quayId, stopPlaceId, lineIds: [lineId] }];
  }

  await LocalStorage.setItem(StorageKeys.savedQuayLines, JSON.stringify(newFavorites));
  return newFavorites;
}

export async function removeFavoriteLine(
  lineId: string,
  quayId: string,
): Promise<QuayLineFavorites[]> {
  const favorites = await loadFavoriteLines();
  if (!favorites) return [];
  const newFavorites = favorites.map((fQuay) => {
    if (fQuay.quayId === quayId) {
      const newLineIds = fQuay.lineIds.filter((line) => line !== lineId);
      return { ...fQuay, lineIds: newLineIds };
    }
    return fQuay;
  });
  await LocalStorage.setItem(StorageKeys.savedQuayLines, JSON.stringify(newFavorites));
  return newFavorites;
}

export async function loadFavoriteLines(): Promise<QuayLineFavorites[] | undefined> {
  const favorites = await LocalStorage.getItem<string>(StorageKeys.savedQuayLines);
  if (!favorites) return undefined;
  return JSON.parse(favorites) as QuayLineFavorites[];
}

export async function wipeStorage() {
  Object.values(StorageKeys).forEach(async (key) => {
    await LocalStorage.removeItem(key);
  });
}
