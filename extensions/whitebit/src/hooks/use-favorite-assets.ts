import { useFavoriteWrapper } from "./use-favorite-wrapper";

export function useFavoriteAssets() {
  const { list, favorite, unfavorite } = useFavoriteWrapper<Ticker>("favorite_assets");

  return {
    favoriteAssets: list,
    favorite,
    unfavorite,
  };
}
