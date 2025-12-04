import { useEffect, useState } from "react";

import { cn } from "../utils/collected-notes";
import { useRaycastCache } from "./use-raycast-cache";

const CACHE_SITES_KEY = "cn_sites";
const CURRENT_SITE_KEY = "currentSite";

export function useSites() {
  const [currentSite, setCurrentSite, clearCachedSites] = useRaycastCache(CURRENT_SITE_KEY);
  const [sites, setSites] = useRaycastCache<Awaited<ReturnType<typeof cn.sites>>>(CACHE_SITES_KEY);
  const [error, setError] = useState<{ error: Error }>();

  async function fetchSites() {
    try {
      if (!sites) {
        const sites = await cn.sites();
        if (sites) {
          setSites(sites);
        }
      }

      if (!currentSite && sites?.length) {
        setCurrentSite(String(sites?.[0].id));
      }
    } catch (error) {
      setError({
        error: error instanceof Error ? error : new Error("Something went wrong"),
      });
    }
  }

  function refreshSites() {
    clearCachedSites();
    fetchSites();
  }

  useEffect(() => {
    fetchSites();
  }, []);

  return {
    currentSite,
    setCurrentSite,
    sites,
    getSiteById: (siteId: string) => sites?.find((site) => site.id === Number(siteId)),
    error,
    sitesAreLoading: !sites && !error,
    refreshSites,
  };
}
