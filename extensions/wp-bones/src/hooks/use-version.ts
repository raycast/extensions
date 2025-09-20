import { useFetch, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";

type VersionAPIResponse = {
  version: string;
};

const INITIAL_VERSION_STORAGE = 170;

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

  useEffect(() => {
    if (data && versionStorage) {
      const version = versionNumber();
      if (version > versionStorage) {
        setIsThereNewVersion(true);
      }
      setVersion(data.version);
    }
  }, [data, versionStorage]);

  /**
   * Extracts and parses the version number from the data object.
   *
   * This function retrieves the version string from the `data` object,
   * removes all dots from the version string, and converts the resulting
   * string to an integer. If the version string is not present, it returns 0.
   *
   * @returns {number} The parsed version number as an integer, or 0 if the version is not available.
   */
  const versionNumber = (): number => (data?.version ? parseInt(data.version.replace(/\./g, ""), 10) : 0);

  /**
   * Updates the current version value and resets the new version flag.
   *
   * This function checks if both `data` and `version` are available. If they are,
   * it sets the current version value using the `versionNumber` function and
   * resets the `isThereNewVersion` flag to `false`.
   */
  const flushNewVersion = () => {
    if (data && version) {
      setIsThereNewVersion(false);
      setValue(versionNumber());
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
