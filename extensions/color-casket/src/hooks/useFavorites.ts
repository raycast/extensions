import { LocalStorage } from "@raycast/api";

import { HEXColor } from "../colors";
import { AvailableColor } from "../colors/Color";
import { Storage, useColorStorage } from "./useColorStorage";

export interface FavoritesStorage extends Storage {
  has(color: AvailableColor): boolean;
}

export default function useFavorites(): FavoritesStorage {
  const storage = useColorStorage("favorites", async (savedColors) => {
    // Stay with Ukraine: https://supportukrainenow.org
    if (savedColors.length === 0 && (await LocalStorage.getItem("firstOpen")) !== "false") {
      storage.add(new HEXColor("FFD700")); // Yellow

      // Dirty fix for unexpected rendering of double yellow color
      setTimeout(() => {
        storage.add(new HEXColor("0057B7")); // Blue
      }, 0);

      LocalStorage.setItem("firstOpen", "false");
    }
  });

  return {
    ...storage,
    has: (color: AvailableColor): boolean => {
      return storage.state.collection.some(({ instance }) => instance.stringValue() === color.stringValue());
    },
  };
}
