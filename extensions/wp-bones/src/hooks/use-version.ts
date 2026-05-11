import { useFetch, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";

type VersionAPIResponse = {
  version: string;
};

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

  const {
    value: versionStorage,
    setValue,
    isLoading: isLoadingVersionStorage,
  } = useLocalStorage("wpbones-version", INITIAL_VERSION_STORAGE);

  function versionToNumber(ver: string): number {
    const parts = ver.split(".").map((p) => {
      const n = parseInt(p, 10);
      return Number.isNaN(n) ? 0 : n;
    });
    return (parts[0] ?? 0) * 1_000_000 + (parts[1] ?? 0) * 1_000 + (parts[2] ?? 0);
  }

  useEffect(() => {
    if (data && versionStorage !== undefined) {
      // Migrate old storage format (170) to new format (1_007_000)
      const stored = versionStorage < 10000 ? versionStorage * 1000 : versionStorage;
      const num = versionToNumber(data.version);
      if (num > stored) {
        setIsThereNewVersion(true);
      }
      setVersion(data.version);
    }
  }, [data, versionStorage]);

  const flushNewVersion = () => {
    if (data && version) {
      setIsThereNewVersion(false);
      setValue(versionToNumber(data.version));
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
