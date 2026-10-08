import { LocalStorage } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useState } from "react";

type VersionAPIResponse = {
  version: string;
};

const STORAGE_KEY = "wpbones-version";
const INITIAL_VERSION_STORAGE = 1_007_000;

/**
 * Custom hook to manage version checking and storage for the application.
 *
 * @returns {object} An object containing:
 * - `version` {string | undefined}: The current version fetched from the API.
 * - `isThereNewVersion` {boolean}: A boolean indicating if there is a new version available.
 * - `flushNewVersion` {() => void}: A function to update the stored version and reset the new version flag.
 * - `isLoading` {boolean}: A boolean indicating if the data is still loading.
 * - `error` {Error | null}: An error object if there was an error fetching the version data.
 */
export function useVersion() {
  const [isThereNewVersion, setIsThereNewVersion] = useState<boolean>(false);
  const [version, setVersion] = useState<string>();

  const { isLoading, data, error } = useFetch<VersionAPIResponse>("https://wpbones.com/api/version");

  const [versionStorage, setVersionStorage] = useState<number | undefined>(undefined);
  const [isLoadingVersionStorage, setIsLoadingVersionStorage] = useState<boolean>(true);

  // Read the stored version on mount. Wrapped in try/catch so a filesystem
  // failure (e.g. ENOSPC on the Raycast cache journal) falls back to the
  // initial version instead of crashing the menu-bar command.
  useEffect(() => {
    (async () => {
      try {
        const raw = await LocalStorage.getItem<number>(STORAGE_KEY);
        setVersionStorage(typeof raw === "number" ? raw : INITIAL_VERSION_STORAGE);
      } catch {
        setVersionStorage(INITIAL_VERSION_STORAGE);
      } finally {
        setIsLoadingVersionStorage(false);
      }
    })();
  }, []);

  function versionToNumber(ver: string): number {
    const parts = ver.split(".").map((p) => {
      const n = parseInt(p, 10);
      return Number.isNaN(n) ? 0 : n;
    });
    return (parts[0] ?? 0) * 1_000_000 + (parts[1] ?? 0) * 1_000 + (parts[2] ?? 0);
  }

  useEffect(() => {
    if (data && versionStorage !== undefined) {
      const num = versionToNumber(data.version);
      // The old storage format ("170" for "1.7.0") cannot be deterministically
      // decoded into major/minor/patch, so we cannot safely compare it against
      // the new format. Treat any value below the minimum new-format value
      // (1_000_000 = 1.0.0) as stale and silently adopt the current version as
      // the baseline. The user may miss a single notification at the migration
      // boundary, but never gets a false positive.
      if (versionStorage < 1_000_000) {
        LocalStorage.setItem(STORAGE_KEY, num).catch(() => {
          // Best-effort write: ignore filesystem failures (e.g. ENOSPC).
        });
      } else if (num > versionStorage) {
        setIsThereNewVersion(true);
      }
      setVersion(data.version);
    }
  }, [data, versionStorage]);

  const flushNewVersion = async () => {
    if (data && version) {
      setIsThereNewVersion(false);
      const num = versionToNumber(data.version);
      setVersionStorage(num);
      try {
        await LocalStorage.setItem(STORAGE_KEY, num);
      } catch {
        // Best-effort write: ignore filesystem failures (e.g. ENOSPC).
      }
    }
  };

  return {
    version,
    isThereNewVersion,
    flushNewVersion,
    isLoading: isLoading || isLoadingVersionStorage,
    error,
  } as const;
}
