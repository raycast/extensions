import { useLocalStorage } from "@raycast/utils";
import { MeetingId, isMeetingId } from "../data/meetings";

export function useFavorites() {
  const { value, setValue, isLoading } = useLocalStorage<string[]>("favorites", []);
  // Drop entries for meetings that no longer exist.
  const favorites = (value ?? []).filter(isMeetingId);

  async function toggleFavorite(id: MeetingId) {
    const next = favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
    await setValue(next);
  }

  return { favorites, toggleFavorite, isLoading };
}
