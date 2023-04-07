import { HIDDEN_PLACEHOLDER } from "~/constants/general";
import { Folder, Item, Vault } from "~/types/vault";
import { Cache } from "~/utils/cache";
import { captureException } from "~/utils/development";
import { useContentEncryptor } from "~/utils/hooks/useContentEncryptor";

function useCachedVault() {
  const { encrypt, decrypt } = useContentEncryptor();

  const getCachedVault = () => {
    try {
      const cachedIv = Cache.get("iv");
      const cachedEncryptedVault = Cache.get("vault");
      if (!cachedIv || !cachedEncryptedVault) return;

      const decryptedVault = decrypt(cachedEncryptedVault, cachedIv);
      return JSON.parse<Vault>(decryptedVault);
    } catch (error) {
      captureException("Failed to decrypt cached vault", error);
      return { items: [], folders: [] };
    }
  };

  const cacheVault = (items: Item[], folders: Folder[]) => {
    try {
      const vaultToEncrypt = JSON.stringify({
        items: prepareItemsForCache(items),
        folders: prepareFoldersForCache(folders),
      });
      const encryptedVault = encrypt(vaultToEncrypt);
      Cache.set("vault", encryptedVault.content);
      Cache.set("iv", encryptedVault.iv);
    } catch (error) {
      captureException("Failed to cache vault", error);
    }
  };

  return { getCachedVault, cacheVault };
}

function prepareItemsForCache(items: Item[]): Item[] {
  return items.map((item) => ({
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
  }));
}

function prepareFoldersForCache(folders: Folder[]): Folder[] {
  return folders.map((folder) => ({ object: folder.object, id: folder.id, name: folder.name }));
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

export default useCachedVault;
