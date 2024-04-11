import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { StateCreator, create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const Infinity32Bit = 2147483647;

export function createActionDeepLink(id: string) {
  return `raycast://extensions/quiknull/alice-ai/commands?arguments=${encodeURIComponent(`{"id":"${id}"}`)}`;
}

export function getPreference(key: keyof Preferences): string {
  return getPreferenceValues<Preferences>()[key];
}

export function createStore<T>(name: string, state: StateCreator<T>) {
  return create<T>()(
    persist(state, {
      name,
      storage: createJSONStorage(() => ({
        getItem: (name: string): Promise<string | null> => LocalStorage.getItem(name).then((value) => value?.toString() ?? null),
        setItem: (name: string, value: string) => LocalStorage.setItem(name, value),
        removeItem: (name: string) => LocalStorage.removeItem(name),
      })),
    }),
  );
}
