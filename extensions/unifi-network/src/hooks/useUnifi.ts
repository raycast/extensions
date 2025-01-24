import { getPreferenceValues } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import type { Site } from "../lib/unifi/types/site";
import { UnifiClient } from "../lib/unifi/unifi";

export function useUnifi() {
  const { value: site, isLoading: siteIsLoading } = useLocalStorage<Site>("selected-site", undefined);
  const preferences = getPreferenceValues<Preferences>();
  const [client] = useState<UnifiClient>(
    new UnifiClient({ apiKey: preferences.apiKey, host: preferences.host, remote: false, site: site?.id }),
  );

  useEffect(() => {
    if (siteIsLoading) {
      return;
    }

    if (!client) {
      return;
    }

    if (!site) {
      return;
    }

    client.SetSite(site.id);
  }, [siteIsLoading, client, site]);

  return { client };
}
