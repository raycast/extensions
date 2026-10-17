import { getWindowsKeyNames } from "./windows-key-names";
import { catalogUrl } from "../config/catalog";
import { useFetch } from "@raycast/utils";
import { getPlatform } from "./platform";
import { useMemo } from "react";

export type KeyCodes = Record<string, string>;

interface IncomingKeyCodes {
  keyCodes: [string, string][];
}

interface UseKeyCodesResult {
  isLoading: boolean;
  data: KeyCodes | undefined;
  revalidate: () => void;
}

export { getWindowsKeyNames } from "./windows-key-names";

export default function useKeyCodes(): UseKeyCodesResult {
  const platform = getPlatform();

  const { isLoading, data, revalidate } = useFetch<IncomingKeyCodes, undefined, KeyCodes>(
    catalogUrl("data/key-codes.json"),
    {
      execute: platform === "macos", // Only fetch on macOS
      mapResult: (result) => ({
        data: Object.fromEntries(result.keyCodes),
      }),
      failureToastOptions: {
        title: "Failed to load key codes",
      },
    }
  );

  // On Windows, provide static key names immediately
  const windowsData = useMemo(() => {
    if (platform === "windows") {
      return getWindowsKeyNames();
    }
    return undefined;
  }, [platform]);

  return {
    isLoading: platform === "windows" ? false : isLoading,
    data: platform === "windows" ? windowsData : data,
    revalidate,
  };
}
