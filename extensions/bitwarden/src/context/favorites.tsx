import { LocalStorage } from "@raycast/api";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LoadingIndicator } from "~/components/searchVault/LoadingIndicator";
import { useBitwarden } from "~/context/bitwarden";
import { useVaultContext } from "~/context/vault";
import { Item } from "~/types/vault";

type FavoritesContext = {
  favoriteOrder: string[];
  setFavoriteOrder: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  toggleFavorite: (item: Item) => Promise<void>;
  moveFavoritePosition: (item: Item, direction: "up" | "down") => Promise<void>;
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
  const { items, updateState } = useVaultContext();

  const [favoriteOrder, setFavoriteOrder] = useState<string[]>();

  useEffect(() => {
    const getFavoriteOrder = async () => {
      const serializedFavoriteOrder = await LocalStorage.getItem<string>("favoriteOrder");
      setFavoriteOrder(serializedFavoriteOrder ? JSON.parse(serializedFavoriteOrder) : []);
    };

    void getFavoriteOrder();
  }, []);

  useEffect(() => {
    if (!favoriteOrder) return;
    void persistFavoriteOrder(favoriteOrder);
  }, [favoriteOrder]);

  useEffect(() => {
    if (!favoriteOrder) return;
    // makes sure the existing favorites have a position in the order array
    const favoriteIdsWithoutOrder = items.reduce<string[]>((result, item) => {
      if (!item.favorite) return result;
      const existingIdInOrderArray = favoriteOrder.find((f) => f === item.id);
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
    updateState((state) => {
      const newState = { ...state };
      const itemIndex = state.items.findIndex((item) => item.id === editedItem.id);
      newState.items[itemIndex] = editedItem;
      return { ...state };
    });
  };

  const moveFavoritePosition = async ({ id }: Item, direction: "up" | "down") => {
    const currentOrder = favoriteOrder.findIndex((f) => f === id);
    const newOrder = currentOrder + (direction === "up" ? -1 : 1);
    const newFavoriteOrder = favoriteOrder.filter((f) => f !== id);
    newFavoriteOrder.splice(newOrder, 0, id);
    setFavoriteOrder(newFavoriteOrder);
  };

  return (
    <FavoritesContext.Provider value={{ favoriteOrder, setFavoriteOrder, toggleFavorite, moveFavoritePosition }}>
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
    console.log({ favoriteOrder, sectionedItems: sectionedItems.favoriteItems.map((f) => f.listOrder) });

    return sectionedItems;
  }, [favoriteOrder, favoriteItems]);

  return groupedItemList;
}
