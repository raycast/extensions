import { useLocalStorage } from "@raycast/utils";
import { useCallback, useMemo } from "react";

const STORAGE_KEY = "design-skills:favorites";

export function useFavorites() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>(STORAGE_KEY, []);

  const favorites = useMemo(() => new Set(value ?? []), [value]);

  const isFavorite = useCallback((slug: string) => favorites.has(slug), [favorites]);

  const toggleFavorite = useCallback(
    async (slug: string) => {
      const next = new Set(favorites);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      await setValue([...next]);
    },
    [favorites, setValue],
  );

  return { favorites, isFavorite, toggleFavorite, isLoading };
}
