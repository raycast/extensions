import { LocalStorage } from "@raycast/api";
import { Dispatch, SetStateAction, createContext, useContext, useEffect, useMemo, useState } from "react";
import { VaultLoadingFallback } from "~/components/searchVault/VaultLoadingFallback";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { useBitwarden } from "~/context/bitwarden";
import { useVaultContext } from "~/context/vault";
import { Item } from "~/types/vault";
import { useAsyncEffect } from "~/utils/hooks/useAsyncEffect";

type FavoritesContext = {
  favoriteOrder: string[];
  setFavoriteOrder: Dispatch<SetStateAction<string[] | undefined>>;
  toggleFavorite: (item: Item) => Promise<void>;
  moveFavorite: (item: Item, direction: "up" | "down") => Promise<void>;
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
    // restore favorite order from local storage
    const serializedFavoriteOrder = await getSavedFavoriteOrder();
    setFavoriteOrder(serializedFavoriteOrder ?? []);
  }, []);

  useEffect(() => {
    // keep local storage favorite order up to date
    if (!favoriteOrder) return;
    void persistFavoriteOrder([...new Set(favoriteOrder)]);
  }, [favoriteOrder]);

  useEffect(() => {
    // makes sure all the existing favorites are in the order array
    if (!favoriteOrder) return;
    const favoriteIdsWithoutOrder = items.reduce<string[]>((result, item) => {
      if (!item.favorite) return result;
      const existingIdInOrderArray = favoriteOrder.find((fid) => fid === item.id);
      if (!existingIdInOrderArray) result.push(item.id);

      return result;
    }, []);
    if (favoriteIdsWithoutOrder.length === 0) return;

    setFavoriteOrder([...favoriteOrder, ...favoriteIdsWithoutOrder]);
  }, [items, favoriteOrder]);

  if (!favoriteOrder) return <VaultLoadingFallback />;

  const toggleFavorite = async (item: Item) => {
    const editedItem = { ...item, favorite: !item.favorite };
    await bitwarden.editItem(editedItem);

    setFavoriteOrder((order = []) => {
      if (!item.favorite) return [editedItem.id, ...order];
      return order.filter((fid) => fid !== editedItem.id);
    });
    updateVaultItem((state) => {
      const itemIndex = state.items.findIndex((item) => item.id === editedItem.id);
      if (itemIndex === -1) return state;
      const newState = { ...state };
      newState.items[itemIndex] = editedItem;
      return newState;
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

export const useFavoritesContext = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error("useFavoritesContext must be used within a FavoritesProvider");
  return context;
};

async function getSavedFavoriteOrder(): Promise<string[] | undefined> {
  const serializedFavoriteOrder = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.VAULT_FAVORITE_ORDER);
  return serializedFavoriteOrder ? JSON.parse(serializedFavoriteOrder) : undefined;
}

async function persistFavoriteOrder(order: string[]): Promise<void> {
  return LocalStorage.setItem(LOCAL_STORAGE_KEY.VAULT_FAVORITE_ORDER, JSON.stringify(order));
}

type FavoriteItem = Item & {
  listOrder: number;
};

export type VaultItemsWithFavorites = {
  favoriteItems: FavoriteItem[];
  nonFavoriteItems: Item[];
};

export function useSeparateFavoriteItems(items: Item[]) {
  const { favoriteOrder } = useFavoritesContext();

  const favoriteItems = useMemo(() => items.filter((item) => item.favorite), [items]);

  const groupedItemList = useMemo(() => {
    const sectionedItems = items.reduce<VaultItemsWithFavorites>(
      (result, item) => {
        if (item.favorite) {
          result.favoriteItems.push({
            ...item,
            listOrder: favoriteOrder.findIndex((fid) => fid === item.id) ?? Number.MAX_SAFE_INTEGER,
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
