import { useEffect, useState } from "react";
import { LocalStorage } from "@raycast/api";

export function usePreferences(scope: string) {
  const [list, setList] = useState(new Map());

  useEffect(() => {
    LocalStorage.getItem<string>(scope).then((result) => {
      let map = new Map();
      try {
        map = new Map(JSON.parse(result || "[]"));
      } catch (e) {
        //
      }

      setList(map);
    });
  }, []);

  async function set(key: string, value: string) {
    const map = new Map(list);

    map.set(key, value);

    setList(map);

    await LocalStorage.setItem(scope, JSON.stringify(Array.from(map)));
  }

  async function unset(key: string) {
    const map = new Map(list);

    map.delete(key);

    setList(map);

    await LocalStorage.setItem(scope, JSON.stringify(Array.from(map)));
  }

  return {
    list,
    set,
    unset,
  };
}
