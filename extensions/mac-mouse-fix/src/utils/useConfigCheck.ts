import { useEffect } from "react";
import { configExists, showConfigErrorIfNeeded } from "./plist";

/**
 * Hook to check if config file exists and show error toast if needed
 * @returns true if config is valid, false otherwise
 */
export function useConfigCheck(): boolean {
  const configOk = configExists();

  useEffect(() => {
    if (!configOk) {
      showConfigErrorIfNeeded();
    }
  }, [configOk]);

  return configOk;
}
