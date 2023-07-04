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
    // makes sure only and all the existing favorites are in the order array
    if (!favoriteOrder) return;
    const cleanFavoriteOrder = items.flatMap((item) => {
      if (!item.favorite) return [];
      return !favoriteOrder.some((fid) => fid === item.id) ? [item.id] : [];
    });
    if (cleanFavoriteOrder.length === 0) return;
    setFavoriteOrder(Array.from(new Set(cleanFavoriteOrder)));
  }, [items, !!favoriteOrder]);

  useEffect(() => {
    // keep local storage favorite order up to date
    if (!favoriteOrder) return;
    void persistFavoriteOrder(favoriteOrder);
  }, [favoriteOrder]);

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
    const currentPosition = favoriteOrder.indexOf(id);
    if (currentPosition === -1) return;

    const newPosition = currentPosition + (direction === "up" ? -1 : 1);
    if (newPosition >= 0 && newPosition < favoriteOrder.length) {
      const newFavoriteOrder = favoriteOrder.slice(0);
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

  return useMemo(() => {
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
  }, [items, favoriteOrder]);
}
