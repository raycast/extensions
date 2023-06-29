import { LocalStorage } from "@raycast/api";
import { useMemo } from "react";
import { Item } from "~/types/vault";
import { useAsyncMemo } from "~/utils/hooks/useAsyncMemo";

export function useVaultFavorites(items: Item[]) {
  const favoriteItems = useMemo(() => items.filter((item) => item.favorite), [items]);

  const favorites = useAsyncMemo(async () => {
    const favoriteOrder = await getFavoriteOrder();
    const favoriteItemsWithOrder = favoriteItems.map((item, index) => ({
      ...item,
      listOrder: favoriteOrder.findIndex((f) => f === item.id) ?? Number.MAX_SAFE_INTEGER - index,
    }));
    const sortedFavoriteItems = favoriteItemsWithOrder.sort((a, b) => b.listOrder - a.listOrder);

    return sortedFavoriteItems;
  }, [favoriteItems]);

  return { favorites };
}

export function useUpdateFavoriteOrder() {
  return async (id: string, direction: "up" | "down") => {
    const favoriteOrder = await getFavoriteOrder();
    const order = favoriteOrder.findIndex((f) => f === id);
    const modifier = direction === "up" ? -1 : 1;
    await updateFavoriteOrder(id, order + modifier, favoriteOrder);
  };
}

async function getFavoriteOrder(): Promise<string[]> {
  const serializedFavoriteOrder = await LocalStorage.getItem<string>("favoriteOrder");
  if (serializedFavoriteOrder) {
    return JSON.parse(serializedFavoriteOrder);
  }
  return [];
}

async function updateFavoriteOrder(id: string, order: number, orderArray: string[]): Promise<void> {
  const favoriteOrder = orderArray.filter((f) => f !== id);
  favoriteOrder.splice(order, 0, id);
  await setFavoriteOrder(favoriteOrder);
}

async function setFavoriteOrder(order: string[]): Promise<void> {
  localStorage.setItem("favoriteOrder", JSON.stringify(order));
}
