import { useLocalStorage } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import { DEFAULT_CONFIG, DrawerConfig } from "./types";
import { parseConfig } from "./utils";

const STORAGE_KEY = "drawer-config";

export function useDrawerConfig() {
  const { value, setValue, isLoading } = useLocalStorage<string>(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));

  const config: DrawerConfig = useMemo(() => parseConfig(value), [value]);

  const updateConfig = useCallback(
    (newConfig: DrawerConfig) => {
      setValue(JSON.stringify(newConfig));
    },
    [setValue],
  );

  return { config, updateConfig, isLoading };
}
