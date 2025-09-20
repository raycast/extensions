import { Color, LocalStorage, getPreferenceValues } from "@raycast/api";
import { StateCreator, create } from "zustand";
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
  return `raycast://extensions/quiknull/alice-ai/commands?arguments=${encodeURIComponent(`{"id":"${id}"}`)}`;
}

export function getPreference(key: keyof Preferences): string {
  return getPreferenceValues<Preferences>()[key];
}

interface StoreOptions<T> {
  name: string;
  state: StateCreator<T>;
  version?: number;
  migrate?: (persistedState: unknown, version: number) => T;
}

export function createStore<T>({ name, version, state, migrate }: StoreOptions<T>) {
  return create<T>()(
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
}

export function truncateText(text: string, maxLength: number): string {
  text = text.trim().replace(/\s+/g, " ");
  if (text.length <= maxLength) {
    return text;
  } else {
    return text.slice(0, maxLength) + "...";
  }
}
