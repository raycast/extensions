export const LAST_USED_COLLECTION_KEY = "last-used-collection";
const LEGACY_LAST_USED_COLLECTION_KEY = "lastUsedCollection";


import { LocalStorage } from "@raycast/api";

export function useLastUsedCollection() {
  const getLastUsedCollection = async () => {
    const collectionId = await LocalStorage.getItem<string>(LAST_USED_COLLECTION_KEY);
    if (collectionId) {
      return collectionId;
    }

    const legacyCollectionId = await LocalStorage.getItem<string>(LEGACY_LAST_USED_COLLECTION_KEY);
    if (legacyCollectionId) {
      await LocalStorage.setItem(LAST_USED_COLLECTION_KEY, legacyCollectionId);
      return legacyCollectionId;
    }

    return null;
  };

  const setLastUsedCollection = async (collectionId: string) => {
    await LocalStorage.setItem(LAST_USED_COLLECTION_KEY, collectionId);
  };

  return { getLastUsedCollection, setLastUsedCollection };
}
