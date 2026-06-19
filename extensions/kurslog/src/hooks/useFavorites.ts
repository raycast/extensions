import { useCachedPromise } from "@raycast/utils";
import {
  getFavoriteDirections,
  getFavoriteExchangers,
  getBlacklistExchangers,
  type FavoriteDirection,
} from "../utils/favorites";

export function useFavoriteDirections() {
  return useCachedPromise(async (): Promise<FavoriteDirection[]> => {
    return getFavoriteDirections();
  }, []);
}

export function useFavoriteExchangers() {
  return useCachedPromise(async (): Promise<string[]> => {
    return getFavoriteExchangers();
  }, []);
}

export function useBlacklistExchangers() {
  return useCachedPromise(async (): Promise<string[]> => {
    return getBlacklistExchangers();
  }, []);
}
