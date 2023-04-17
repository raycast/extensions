import { prepareFoldersForCache, prepareItemsForCache } from "~/components/searchVault/utils/caching";
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

export default useCachedVault;
