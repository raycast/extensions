import { LocalStorage } from "@raycast/api";
import { createLibraryStore } from "./library-store";

export const library = createLibraryStore({
  all: () => LocalStorage.allItems(),
  get: (key) => LocalStorage.getItem(key),
  set: (key, value) => LocalStorage.setItem(key, value),
  remove: (key) => LocalStorage.removeItem(key),
});
