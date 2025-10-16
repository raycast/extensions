import { useFavoriteWrapper } from "./use-favorite-wrapper";

export function useFavoriteMarkets() {
  const { list, favorite, unfavorite } = useFavoriteWrapper<MarketName>("favorite_markets");

  return {
    list,
    favorite,
    unfavorite,
  };
}
