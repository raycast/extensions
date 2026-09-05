import useSWR from "swr";
import { ISite } from "../types";
import { Site } from "../api/Site";
import { unwrapToken } from "../lib/auth";

// Preference keys for the (up to) two supported accounts. An empty/absent token
// makes getSitesWithoutServer return [], so the second account degrades cleanly.
const TOKEN_KEYS = ["laravel_forge_api_key", "laravel_forge_api_key_two"] as const;

const fetcher = async (): Promise<ISite[]> => {
  const perAccount = await Promise.all(
    TOKEN_KEYS.map((key) => Site.getSitesWithoutServer({ token: unwrapToken(key) }))
  );
  // Two tokens in the same org would each return that org's sites; dedupe by id
  // (keep first) so rows and their React keys stay unique.
  return [...new Map(perAccount.flat().map((site) => [site.id, site])).values()];
};

export const useGlobalSites = () => {
  const { data, error } = useSWR<ISite[]>("global-sites", fetcher, {
    refreshInterval: 60_000 * 5,
  });

  return {
    sites: data,
    loading: !error && !data,
    error: error as Error | undefined,
  };
};
