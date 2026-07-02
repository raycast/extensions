import type { WooStore } from "../types/types";
import { useLocalStorage } from "@raycast/utils";

export function useStores() {
  const {
    value: stores,
    setValue: setStores,
    removeValue: clearStores,
    isLoading,
  } = useLocalStorage<WooStore[]>("woo-stores", []);

  async function createStore(store: WooStore) {
    const sorted = sortStores([...(stores ?? []), store]);
    await setStores(sorted);
  }

  async function updateStore(updatedStore: WooStore) {
    const updated = (stores ?? []).map((s) => (s.id === updatedStore.id ? updatedStore : s));
    const sorted = sortStores(updated);
    await setStores(sorted);
  }

  async function deleteStore(storeId: string) {
    const updated = (stores ?? []).filter((s) => s.id !== storeId);
    await setStores(updated);
  }

  async function toggleFavourite(storeId: string) {
    const updated = (stores ?? []).map((s) => (s.id === storeId ? { ...s, favourite: !s.favourite } : s));
    const sorted = sortStores(updated);
    await setStores(sorted);
  }

  return {
    stores: stores ?? [],
    isLoading,
    createStore,
    updateStore,
    deleteStore,
    clearStores,
    toggleFavourite,
  };
}

function sortStores(stores: WooStore[]): WooStore[] {
  return stores.sort((a, b) => {
    if (a.favourite === b.favourite) {
      return a.name.localeCompare(b.name);
    }
    return a.favourite ? -1 : 1;
  });
}
