import { getPreferenceValues } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import type { Site } from "../lib/unifi/types/site";
import { UnifiClient } from "../lib/unifi/unifi";
import useAuth from "./use-auth";

let uiClient: UnifiClient;

export default function useUnifi() {
  const { isLegacy } = useAuth();

  const { value: site, isLoading: siteIsLoading } = useLocalStorage<Site>("selected-site", undefined);
  const preferences = getPreferenceValues();
  const [client, setClient] = useState<UnifiClient>();

  useEffect(() => {
    if (isLegacy) return;

    if (!siteIsLoading) {
      return;
    }

    if (uiClient) {
      setClient(uiClient);
    }

    if (!client) {
      uiClient = new UnifiClient({
        apiKey: preferences.apiKey,
        host: preferences.host,
        remote: false,
        site: site?.id,
      });
      setClient(uiClient);
    }
  }, [client, siteIsLoading, isLegacy, preferences]);

  useEffect(() => {
    console.log("Setting site", site);
    if (isLegacy) return;

    if (client && site && !siteIsLoading) {
      client.SetSite(site.id);
    }
  }, [client, site, isLegacy, siteIsLoading]);

  return { client, siteIsLoading, site };
}
