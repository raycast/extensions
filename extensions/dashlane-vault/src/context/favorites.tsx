import { useCachedState } from "@raycast/utils";
import { createContext, useContext, useMemo } from "react";

export type FavoritesContextType = {
  favorites: string[] | undefined;
  add: (id: string) => void;
  remove: (id: string) => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  isFavorite: (id: string) => boolean;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

type Props = {
  children: React.ReactNode;
  cacheKey: string;
};

export function FavoritesProvider({ children, cacheKey }: Props) {
  const [favorites, setFavorites] = useCachedState<string[]>(cacheKey, []);

  function add(id: string) {
    setFavorites((favorites) => [...favorites, id]);
  }

  function remove(id: string) {
    setFavorites((favorites) => favorites.filter((favorite) => favorite !== id));
  }

  function moveUp(id: string) {
    move(id, "up");
  }

  function moveDown(id: string) {
    move(id, "down");
  }

  function isFavorite(id: string) {
    return favorites.includes(id);
  }

  function move(id: string, direction: "up" | "down") {
    setFavorites((favorites) => {
      const index = favorites.indexOf(id);
      if (index === -1) {
        return favorites;
      }

      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= favorites.length) {
        return favorites;
      }

      const newFavorites = [...favorites];
      newFavorites[index] = newFavorites[newIndex];
      newFavorites[newIndex] = id;
      return newFavorites;
    });
  }

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, moveUp, moveDown, remove, add }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavoritesContext must be used within a FavoritesProvider");
  }
  return context;
}

export function useSeparateFavoriteItems<T extends { id: string }>(
  items: T[],
): { favoriteItems: T[]; nonFavoriteItems: T[] } {
  const { favorites = [] } = useFavoritesContext();

  return useMemo(() => {
    if (favorites.length === 0) return { favoriteItems: [], nonFavoriteItems: items };

    const favoriteItemsMap: Record<string, T> = {};
    const nonFavoriteItems: T[] = [];

    for (const item of items) {
      if (favorites.includes(item.id)) {
        favoriteItemsMap[item.id] = item;
      } else {
        nonFavoriteItems.push(item);
      }
    }

    const favoriteItems = favorites.map((id) => favoriteItemsMap[id]).filter(Boolean);
    return {
      favoriteItems,
      nonFavoriteItems,
    };
  }, [favorites, items]);
}
