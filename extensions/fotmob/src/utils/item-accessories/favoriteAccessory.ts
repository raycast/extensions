import type { List } from "@raycast/api";
import { Icon } from "@raycast/api";
import { getItem } from "@/storages";

type ItemType = "team" | "player" | "league";

export async function favoriteAccessories(itemType: ItemType, itemId: string | number): Promise<List.Item.Accessory[]> {
  const resultItems: List.Item.Accessory[] = [];

  if (itemType === "team") {
    const items = (await getItem("favoriteTeams")) ?? [];
    const isFavorite = items.some((item) => item.id === itemId);

    if (isFavorite) {
      resultItems.push({
        icon: Icon.Star,
      });
    }
  }

  if (itemType === "player") {
    const items = (await getItem("favoritePlayers")) ?? [];
    const isFavorite = items.some((item) => item.id === itemId);

    if (isFavorite) {
      resultItems.push({
        icon: Icon.Star,
      });
    }
  }

  if (itemType === "league") {
    const items = (await getItem("favoriteLeagues")) ?? [];
    const isFavorite = items.some((item) => item.id === itemId);

    if (isFavorite) {
      resultItems.push({
        icon: Icon.Star,
      });
    }
  }

  return resultItems;
}
