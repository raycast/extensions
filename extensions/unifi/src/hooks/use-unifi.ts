import { useMemo } from "react";
import { UniFiClient } from "../api/client";
import { getUniFiPreferences } from "../api/preferences";

export function useUniFiClient(): UniFiClient {
  const preferences = getUniFiPreferences();
  return useMemo(
    () => new UniFiClient(preferences),
    [
      preferences.allowSelfSignedCertificate,
      preferences.apiKey,
      preferences.connectionMode,
      preferences.consoleId,
      preferences.controllerUrl,
    ],
  );
}
