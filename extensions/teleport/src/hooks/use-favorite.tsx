import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";

export function useFavorite<T>(key: string) {
  const [list, setList] = useState<Set<T>>(new Set());

  useEffect(() => {
    LocalStorage.getItem<string>(key).then((result) => {
      let set = new Set<T>();
      try {
        set = new Set<T>(JSON.parse(result || "[]"));
      } catch (e) {
        //
      }

      setList(set);
    });
  }, []);

  async function favorite(item: T) {
    const set = new Set(list);

    set.add(item);

    setList(set);

    await LocalStorage.setItem(key, JSON.stringify(Array.from(set)));
  }

  async function unfavorite(item: T) {
    const set = new Set(list);

    set.delete(item);

    setList(set);

    await LocalStorage.setItem(key, JSON.stringify(Array.from(set)));
  }

  async function toggleFavorite(item: T) {
    list.has(item) ? await unfavorite(item) : await favorite(item);
  }

  return {
    list,
    favorite,
    unfavorite,
    toggleFavorite,
  };
}
