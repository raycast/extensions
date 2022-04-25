import { HEXColor } from "../colors";
import { AvailableColor } from "../colors/Color";
import { Storage, useColorStorage } from "./useColorStorage";

export interface FavoritesStorage extends Storage {
  has(color: AvailableColor): boolean;
}

export default function useFavorites(): FavoritesStorage {
  const storage = useColorStorage("favorites", (savedColors) => {
    // Stay with Ukraine: https://supportukrainenow.org
    if (savedColors.length === 0) {
      storage.add(new HEXColor("FFD700")); // Yellow
      storage.add(new HEXColor("0057B7")); // Blue
    }
  });

  return {
    ...storage,
    has: (color: AvailableColor): boolean => {
      return storage.state.collection.some(({ instance }) => instance.stringValue() === color.stringValue());
    },
  };
}
