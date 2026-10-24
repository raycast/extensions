import { useLocalStorage } from "@raycast/utils";
import { updateIds } from "../lib/storage";

const KEY = "charter-favorites";

export function useFavorites() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>(KEY, []);
  const favorites = value ?? [];

  function isFavorite(id: string): boolean {
    return favorites.includes(id);
  }

  async function toggle(id: string): Promise<boolean> {
    const next = await updateIds(KEY, (ids) => (ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]));
    await setValue(next);
    return next.includes(id);
  }

  return { favorites, isFavorite, toggle, isLoading };
}
