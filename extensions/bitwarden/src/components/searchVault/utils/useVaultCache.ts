import { Cache } from "@raycast/api";
import { HIDDEN_PLACEHOLDER } from "~/constants/general";
import { CacheVaultList, Folder, Item } from "~/types/vault";
import { captureException } from "~/utils/development";
import { useContentEncryptor } from "~/utils/hooks/useContentEncryptor";

function useCachedVault() {
  const { encrypt, decrypt } = useContentEncryptor();

  const getCachedVault = () => {
    try {
      const cache = new Cache();
      const cachedIv = cache.get("iv");
      const cachedEncryptedVault = cache.get("vault");
      if (!cachedIv || !cachedEncryptedVault) throw new Error("No cached vault found");

      const decryptedVault = decrypt({ content: cachedEncryptedVault, iv: cachedIv });
      return JSON.parse<CacheVaultList>(decryptedVault);
    } catch (error) {
      captureException("Failed to decrypt cached vault", error);
      return { items: [], folders: [] };
    }
  };

  const cacheVault = (items: Item[], folders: Folder[]) => {
    try {
      const cacheItems = prepareItemsForCache(items);
      const cacheFolders = prepareFoldersForCache(folders);
      const vaultToEncrypt = JSON.stringify({ items: cacheItems, folders: cacheFolders });
      const encryptedVault = encrypt(vaultToEncrypt);

      const cache = new Cache();
      cache.set("vault", encryptedVault.content);
      cache.set("iv", encryptedVault.iv);
    } catch (error) {
      captureException("Failed to cache vault", error);
    }
  };

  return { getCachedVault, cacheVault };
}

function prepareItemsForCache(items: Item[]): Item[] {
  return items.map(prepareItemForCache);
}

function prepareFoldersForCache(folders: Folder[]): Folder[] {
  return folders.map(prepareFolderForCache);
}

function cleanLogin(login: Item["login"]): Item["login"] {
  if (!login) return undefined;
  // leave username because it's necessary to display in the list
  return { ...hideStringProperties(login), username: login.username };
}

function cleanFields(fields: Item["fields"]): Item["fields"] {
  if (!fields) return undefined;
  // leave name because it's necessary to display in the list
  return fields.map((field) => ({ name: field.name, value: HIDDEN_PLACEHOLDER, type: field.type }));
}

function hideStringProperties<T extends RecordOfAny | undefined>(obj: T): T {
  if (!obj) return undefined as T;
  const cleanObj: T = { ...obj };
  for (const [key, value] of Object.entries(obj)) {
    if (value != null && typeof value === "string") {
      cleanObj[key] = HIDDEN_PLACEHOLDER;
    }
  }
  return cleanObj as T;
}

function prepareItemForCache(item: Item): Item {
  return {
    object: item.object,
    id: item.id,
    organizationId: item.organizationId,
    folderId: item.folderId,
    type: item.type,
    name: item.name,
    revisionDate: item.revisionDate,
    favorite: item.favorite,
    reprompt: item.reprompt,
    // sensitive data below
    collectionIds: [],
    notes: item.notes != null ? HIDDEN_PLACEHOLDER : item.notes,
    passwordHistory: undefined,
    secureNote: undefined,
    login: cleanLogin(item.login),
    identity: hideStringProperties(item.identity),
    fields: cleanFields(item.fields),
    card: hideStringProperties(item.card),
  };
}

function prepareFolderForCache(folder: Folder): Folder {
  return { object: folder.object, id: folder.id, name: folder.name };
}

export default useCachedVault;
