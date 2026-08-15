import { getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";
import { getYandexAccessToken } from "../api/oauth";

export type YandexAuthStatus = "no-client" | "loading" | "connect" | "ready";

export function useYandexAuth(): {
  status: YandexAuthStatus;
  clientId: string | null;
  token: string | null;
  setToken: (token: string | null) => void;
} {
  const prefs = getPreferenceValues<{ clientId?: string }>();
  const clientId = prefs.clientId?.trim() ?? null;
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!clientId) {
      setToken(null);
      return;
    }
    getYandexAccessToken(clientId).then(setToken);
  }, [clientId]);

  if (!clientId) {
    return { status: "no-client", clientId: null, token: null, setToken };
  }
  if (token === undefined) {
    return { status: "loading", clientId, token: null, setToken };
  }
  if (token === null) {
    return { status: "connect", clientId, token: null, setToken };
  }
  return { status: "ready", clientId, token, setToken };
}
