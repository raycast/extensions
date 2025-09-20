import { getPreferenceValues } from "@raycast/api";
import { prepareFoldersForCache, prepareItemsForCache } from "~/components/searchVault/utils/caching";
import { CACHE_KEYS } from "~/constants/general";
import { Folder, Item, Vault } from "~/types/vault";
import { Cache } from "~/utils/cache";
import { captureException } from "~/utils/development";
import { useContentEncryptor } from "~/utils/hooks/useContentEncryptor";
import useOnceEffect from "~/utils/hooks/useOnceEffect";

function useVaultCaching() {
  const { encrypt, decrypt } = useContentEncryptor();
  const isCachingEnable = getPreferenceValues<Preferences.Search>().shouldCacheVaultItems;

  useOnceEffect(() => {
    // users that opt out of caching probably want to delete any cached data
    if (!Cache.isEmpty) Cache.clear();
  }, !isCachingEnable);

  const getCachedVault = (): Vault => {
    try {
      if (!isCachingEnable) throw new VaultCachingNoEnabledError();

      const cachedIv = Cache.get(CACHE_KEYS.IV);
      const cachedEncryptedVault = Cache.get(CACHE_KEYS.VAULT);
      if (!cachedIv || !cachedEncryptedVault) throw new VaultCachingNoEnabledError();

      const decryptedVault = decrypt(cachedEncryptedVault, cachedIv);
      return JSON.parse<Vault>(decryptedVault);
    } catch (error) {
      if (!(error instanceof VaultCachingNoEnabledError)) {
        captureException("Failed to decrypt cached vault", error);
      }
      return { items: [], folders: [] };
    }
  };

  const cacheVault = (items: Item[], folders: Folder[]): void => {
    try {
      if (!isCachingEnable) throw new VaultCachingNoEnabledError();

      const vaultToEncrypt = JSON.stringify({
        items: prepareItemsForCache(items),
        folders: prepareFoldersForCache(folders),
      });
      const encryptedVault = encrypt(vaultToEncrypt);
      Cache.set(CACHE_KEYS.VAULT, encryptedVault.content);
      Cache.set(CACHE_KEYS.IV, encryptedVault.iv);
    } catch (error) {
      if (!(error instanceof VaultCachingNoEnabledError)) {
        captureException("Failed to cache vault", error);
      }
    }
  };

  return { getCachedVault, cacheVault };
}

class VaultCachingNoEnabledError extends Error {}

export default useVaultCaching;
