import { LocalStorage } from "@raycast/api";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LoadingIndicator } from "~/components/searchVault/LoadingIndicator";
import { useBitwarden } from "~/context/bitwarden";
import { useVaultContext } from "~/context/vault";
import { Item } from "~/types/vault";
import { useAsyncEffect } from "~/utils/hooks/useAsyncEffect";

type FavoritesContext = {
  favoriteOrder: string[];
  setFavoriteOrder: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  toggleFavorite: (item: Item) => Promise<void>;
  moveFavorite: (item: Item, direction: "up" | "down") => Promise<void>;
};

type FavoriteItem = Item & {
  listOrder: number;
};

const FavoritesContext = createContext<FavoritesContext>({} as FavoritesContext);

type FavoritesProviderProps = {
  children: React.ReactNode;
};

export function FavoritesProvider(props: FavoritesProviderProps) {
  const { children } = props;
  const bitwarden = useBitwarden();
  const { items, updateState: updateVaultItem } = useVaultContext();

  const [favoriteOrder, setFavoriteOrder] = useState<string[]>();

  useAsyncEffect(async () => {
    const serializedFavoriteOrder = await LocalStorage.getItem<string>("favoriteOrder");
    setFavoriteOrder(serializedFavoriteOrder ? JSON.parse(serializedFavoriteOrder) : []);
  }, []);

  useEffect(() => {
    if (!favoriteOrder) return;
    void persistFavoriteOrder(favoriteOrder);
  }, [favoriteOrder]);

  useEffect(() => {
    if (!favoriteOrder) return;
    // makes sure all the existing favorites are in the order array
    const favoriteIdsWithoutOrder = items.reduce<string[]>((result, item) => {
      if (!item.favorite) return result;
      const existingIdInOrderArray = favoriteOrder.find((fid) => fid === item.id);
      if (!existingIdInOrderArray) result.push(item.id);
      return result;
    }, []);
    if (favoriteIdsWithoutOrder.length === 0) return;
    setFavoriteOrder([...favoriteOrder, ...favoriteIdsWithoutOrder]);
  }, [items, favoriteOrder]);

  if (!favoriteOrder) return <LoadingIndicator />;

  const toggleFavorite = async (item: Item) => {
    const editedItem = { ...item, favorite: !item.favorite };
    await bitwarden.editItem(editedItem);
    setFavoriteOrder((order = []) => {
      if (!item.favorite) return [editedItem.id, ...order];
      return order.filter((fid) => fid !== editedItem.id);
    });
    updateVaultItem((state) => {
      const newState = { ...state };
      const itemIndex = state.items.findIndex((item) => item.id === editedItem.id);
      newState.items[itemIndex] = editedItem;
      return { ...state };
    });
  };

  const moveFavorite = async ({ id }: Item, direction: "up" | "down") => {
    const currentPosition = favoriteOrder.findIndex((fid) => fid === id);
    if (currentPosition === -1) return;

    const newPosition = currentPosition + (direction === "up" ? -1 : 1);
    if (newPosition >= 0 && newPosition < favoriteOrder.length) {
      const newFavoriteOrder = [...favoriteOrder];
      newFavoriteOrder.splice(currentPosition, 1); // remove from current position
      newFavoriteOrder.splice(newPosition, 0, id); // insert at new position
      setFavoriteOrder(newFavoriteOrder);
    }
  };

  return (
    <FavoritesContext.Provider value={{ favoriteOrder, setFavoriteOrder, toggleFavorite, moveFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

async function persistFavoriteOrder(order: string[]): Promise<void> {
  return LocalStorage.setItem("favoriteOrder", JSON.stringify(order));
}

export const useFavoritesContext = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavoritesContext must be used within a FavoritesProvider");
  return context;
};

export function useFavoriteItemsGroup(items: Item[]) {
  const { favoriteOrder } = useFavoritesContext();

  const favoriteItems = useMemo(() => items.filter((item) => item.favorite), [items]);

  const groupedItemList = useMemo(() => {
    const sectionedItems = items.reduce<{ favoriteItems: FavoriteItem[]; nonFavoriteItems: Item[] }>(
      (result, item) => {
        if (item.favorite) {
          result.favoriteItems.push({
            ...item,
            listOrder: favoriteOrder.findIndex((f) => f === item.id) ?? Number.MAX_SAFE_INTEGER,
          });
        } else {
          result.nonFavoriteItems.push(item);
        }
        return result;
      },
      { favoriteItems: [], nonFavoriteItems: [] }
    );
    sectionedItems.favoriteItems.sort((a, b) => a.listOrder - b.listOrder);

    return sectionedItems;
  }, [favoriteOrder, favoriteItems]);

  return groupedItemList;
}
