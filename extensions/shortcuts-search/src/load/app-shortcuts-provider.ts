import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { InputApp } from "../model/input/input-models";
import { Application } from "../model/internal/internal-models";
import { ShortcutsParser } from "./input-parser";
import { getPlatform } from "./platform";
import useKeyCodes from "./key-codes-provider";

interface UseAppShortcutsResult {
  isLoading: boolean;
  data: Application | undefined;
}

export function useAppShortcuts(slug: string | undefined): UseAppShortcutsResult {
  const platform = getPlatform();
  const keyCodesResult = useKeyCodes();

  const { isLoading, data } = useFetch<InputApp>(`https://hotkys.com/data/${platform}/${slug}.json`, {
    execute: !!slug,
    failureToastOptions: {
      title: "Failed to load shortcuts",
    },
  });

  // Parse the input app with keyCodes
  // Done outside useFetch to avoid Map serialization issues
  const application = useMemo(() => {
    if (!data || !keyCodesResult.data) return undefined;
    return new ShortcutsParser(keyCodesResult.data).parseInputShortcuts([data])[0];
  }, [data, keyCodesResult.data]);

  return {
    isLoading: isLoading || keyCodesResult.isLoading,
    data: application,
  };
}
