import { useLocalStorage } from "@raycast/utils";

export function useFavorites() {
  const { value: favorites, setValue, isLoading } = useLocalStorage<string[]>("favorites", []);

  function toggleFavorite(slug: string) {
    const current = favorites ?? [];
    const next = current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug];
    setValue(next);
  }

  return { favorites: favorites ?? [], toggleFavorite, isLoading };
}
