import { WritableAtom, SetStateAction, atom } from "jotai";
import { RESET } from "jotai/utils";
import { LocalStorage } from "@raycast/api";

export function atomWithLocalStorage<Value>(
  key: string,
  initialValue: Value
): WritableAtom<{ loading: boolean; value: Value }, SetStateAction<Value> | typeof RESET, Promise<void>> {
  let lastStr = "";
  let lastValue = initialValue;

  const jsonStorage = {
    getItem: (key: string) => {
      const parse = (str: unknown) => {
        if (typeof str !== "string") {
          return lastValue;
        }
        if (lastStr !== str) {
          lastValue = JSON.parse(str);
          lastStr = str;
        }
        return lastValue;
      };
      return LocalStorage.getItem(key).then(parse);
    },
    setItem: (key: string, newValue: Value) => LocalStorage.setItem(key, JSON.stringify(newValue)),
    removeItem: (key: string) => LocalStorage.removeItem(key),
  };

  const baseAtom = atom({ loading: true, value: initialValue });

  baseAtom.onMount = (setAtom) => {
    jsonStorage
      .getItem(key)
      .catch(() => initialValue)
      .then((newValue) =>
        setAtom((state) => {
          if (!state.loading) {
            return state;
          }
          return { loading: false, value: newValue };
        })
      );
  };

  const anAtom = atom(
    (get) => get(baseAtom),
    (get, set, update: SetStateAction<Value> | typeof RESET) => {
      if (update === RESET) {
        set(baseAtom, { loading: false, value: initialValue });
        return jsonStorage.removeItem(key);
      }
      const newValue = typeof update === "function" ? (update as (prev: Value) => Value)(get(baseAtom).value) : update;
      set(baseAtom, { loading: false, value: newValue });
      return jsonStorage.setItem(key, newValue);
    }
  );

  return anAtom;
}
