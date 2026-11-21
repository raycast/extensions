import { getDrinkPresets } from "../utils/drinkPresets";
import { getCustomDrinks, getFavoriteIds } from "../utils/storage";

type Input = {
  /** Only return favorites when the user asks for favorite drinks. Defaults to all presets. */
  favoritesOnly?: boolean;
};

export default async function listCaffeineDrinks({ favoritesOnly = false }: Input = {}) {
  const [custom, favoriteIds] = await Promise.all([getCustomDrinks(), getFavoriteIds()]);
  const favorites = new Set(favoriteIds);
  return getDrinkPresets(custom)
    .filter(({ id }) => !favoritesOnly || favorites.has(id))
    .map(({ id, name, defaultCaffeineMg, servingMl }) => ({
      id,
      name,
      caffeineMg: defaultCaffeineMg,
      servingMl: servingMl ?? null,
      favorite: favorites.has(id),
    }))
    .sort((a, b) => Number(b.favorite) - Number(a.favorite));
}
