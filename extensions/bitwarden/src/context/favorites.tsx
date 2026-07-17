import { LocalStorage } from "@raycast/api";
import { Dispatch, SetStateAction, createContext, useContext, useEffect, useMemo, useState } from "react";
import { VaultLoadingFallback } from "~/components/searchVault/VaultLoadingFallback";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { useVaultContext } from "~/context/vault";
import { Item } from "~/types/vault";
import { captureException } from "~/utils/development";
import { useAsyncEffect } from "~/utils/hooks/useAsyncEffect";

type FavoritesContext = {
  favoriteOrder: string[];
  setFavoriteOrder: Dispatch<SetStateAction<string[] | undefined>>;
  toggleFavorite: (item: Item) => void;
  moveFavorite: (item: Item, direction: "up" | "down") => void;
};

const FavoritesContext = createContext<FavoritesContext>({} as FavoritesContext);

type FavoritesProviderProps = {
  children: React.ReactNode;
};

export function FavoritesProvider({ children }: FavoritesProviderProps) {
  const { items } = useVaultContext();

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

  const toggleFavorite = (item: Item) => {
    setFavoriteOrder((order = []) => {
      if (!favoriteOrder?.includes(item.id)) return [item.id, ...order];
      return order.filter((fid) => fid !== item.id);
    });
  };

  const moveFavorite = ({ id }: Item, direction: "up" | "down") => {
    if (!favoriteOrder) return;
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

  if (!favoriteOrder) return <VaultLoadingFallback />;

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

async function getSavedFavoriteOrder() {
  try {
    const serializedFavoriteOrder = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.VAULT_FAVORITE_ORDER);
    return serializedFavoriteOrder ? JSON.parse<string[]>(serializedFavoriteOrder) : undefined;
  } catch (error) {
    captureException("Failed to get favorite order from local storage", error);
    return undefined;
  }
}

async function persistFavoriteOrder(order: string[]) {
  try {
    await LocalStorage.setItem(LOCAL_STORAGE_KEY.VAULT_FAVORITE_ORDER, JSON.stringify(order));
  } catch (error) {
    captureException("Failed to persist favorite order to local storage", error);
  }
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
        const favoritePosition = favoriteOrder.indexOf(item.id);
        if (item.favorite || favoritePosition !== -1) {
          result.favoriteItems.push({ ...item, listOrder: favoritePosition ?? Number.MAX_SAFE_INTEGER });
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
