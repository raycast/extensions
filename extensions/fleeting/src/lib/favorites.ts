import { usePromise } from "@raycast/utils";
import { MeetingId } from "../data/meetings";
import { getFavorites, setFavorite } from "./favorite-storage";

export function useFavorites() {
  const { data, mutate, isLoading } = usePromise(getFavorites);
  const favorites = data ?? [];

  async function toggleFavorite(id: MeetingId) {
    await mutate(setFavorite(id, !favorites.includes(id)));
  }

  return { favorites, toggleFavorite, isLoading };
}
