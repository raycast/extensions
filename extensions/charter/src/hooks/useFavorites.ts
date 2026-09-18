import { useLocalStorage } from "@raycast/utils";

const KEY = "charter-favorites";

export function useFavorites() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>(KEY, []);
  const favorites = value ?? [];

  function isFavorite(id: string): boolean {
    return favorites.includes(id);
  }

  async function toggle(id: string): Promise<boolean> {
    const next = isFavorite(id) ? favorites.filter((item) => item !== id) : [...favorites, id];
    await setValue(next);
    return next.includes(id);
  }

  return { favorites, isFavorite, toggle, isLoading };
}
