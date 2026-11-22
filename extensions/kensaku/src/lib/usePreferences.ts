import { useMemo } from "react";
import { getPreferenceValues } from "@raycast/api";
import type { ExtensionPreferences } from "./types";

/** Returns a memoized preference object so `useEffect` hooks do not abort on re-renders. */
export function useExtensionPreferences(): ExtensionPreferences {
  const raw = getPreferenceValues<ExtensionPreferences>();

  return useMemo(
    () => ({
      cliPath: raw.cliPath,
      serverPort: raw.serverPort,
      autoStartServer: raw.autoStartServer,
      defaultLimit: raw.defaultLimit,
      showDetailByDefault: raw.showDetailByDefault,
    }),
    [raw.cliPath, raw.serverPort, raw.autoStartServer, raw.defaultLimit, raw.showDetailByDefault],
  );
}
