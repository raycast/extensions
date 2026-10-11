import { Color, LocalStorage, getPreferenceValues } from "@raycast/api";
import { useStore } from "zustand/react";
import { StateCreator, createStore as createVanillaStore } from "zustand/vanilla";
import { createJSONStorage, persist } from "zustand/middleware";

export const Infinity32Bit = 2147483647;

export const Colors = {
  Blue: Color.Blue,
  Green: Color.Green,
  Magenta: Color.Magenta,
  Orange: Color.Orange,
  Purple: Color.Purple,
  Red: Color.Red,
  Yellow: Color.Yellow,
};

export function createActionDeepLink(id: string) {
  return `${process.env.RAYCAST_SCHEME ?? "raycast"}://extensions/quiknull/alice-ai/commands?arguments=${encodeURIComponent(`{"id":"${id}"}`)}`;
}

export function getPreference(key: keyof Preferences): string {
  return getPreferenceValues<Preferences>()[key] ?? "";
}

interface StoreOptions<T> {
  name: string;
  state: StateCreator<T>;
  version?: number;
  migrate?: (persistedState: unknown, version: number) => T;
}

export function createStore<T>({ name, version, state, migrate }: StoreOptions<T>) {
  // Import both subpaths explicitly so Raycast includes them in the packaged exports.
  const store = createVanillaStore<T>()(
    persist(state, {
      name,
      version,
      migrate,
      storage: createJSONStorage(() => ({
        getItem: (name: string): Promise<string | null> => LocalStorage.getItem(name).then((value) => value?.toString() ?? null),
        setItem: (name: string, value: string) => LocalStorage.setItem(name, value),
        removeItem: (name: string) => LocalStorage.removeItem(name),
      })),
    }),
  );

  const useBoundStore = <U>(selector: (state: T) => U) => useStore(store, selector);
  return Object.assign(useBoundStore, store);
}

export function truncateText(text: string, maxLength: number): string {
  text = text.trim().replace(/\s+/g, " ");
  if (text.length <= maxLength) {
    return text;
  } else {
    return text.slice(0, maxLength) + "...";
  }
}
