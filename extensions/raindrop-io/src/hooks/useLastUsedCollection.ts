import { LocalStorage } from "@raycast/api";

export function useLastUsedCollection() {
  const getLastUsedCollection = async () => {
    return await LocalStorage.getItem<string>("lastUsedCollection");
  };

  const setLastUsedCollection = async (collectionId: string) => {
    await LocalStorage.setItem("lastUsedCollection", collectionId);
  };

  return { getLastUsedCollection, setLastUsedCollection };
}
