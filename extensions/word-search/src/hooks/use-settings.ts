import { useMemo } from "react";

import { getPreferenceValues } from "@raycast/api";

export const useClipboardSetting = <
  T extends {
    useClipboard: "true" | "false" | "global";
    useClipboardGlobal: boolean;
  },
>() => {
  const useClipboard = useMemo(() => {
    const settings = getPreferenceValues<T>();
    if (settings.useClipboard === "true") {
      return true;
    }
    if (settings.useClipboard === "global") {
      return settings.useClipboardGlobal;
    }
    return false;
  }, []);

  return useClipboard;
};
