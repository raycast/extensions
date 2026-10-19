import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { CoolSiteType, coolSiteSchema } from "./coolSiteTypesAndSchemas";

const COOL_SITES_URL = "https://lucasvogel.click/api/cool-sites.json";

export async function fetchCoolSites(): Promise<CoolSiteType[]> {
  const response = await fetch(COOL_SITES_URL, { headers: { "content-type": "application/json" } });
  if (!response.ok) throw new Error(`Could not load cool sites (${response.status})`);
  return coolSiteSchema.array().parse(await response.json());
}

export function useCoolSites() {
  const { data, error, isLoading, revalidate } = useFetch<CoolSiteType[]>(COOL_SITES_URL, {
    headers: { "content-type": "application/json" },
    parseResponse: async (response) => coolSiteSchema.array().parse(await response.json()),
    keepPreviousData: true,
  });
  const coolSites = useMemo(
    () => Array.from(new Map<string, CoolSiteType>((data ?? []).map((site) => [site.id, site])).values()),
    [data],
  );
  const tags = useMemo(() => Array.from(new Set(coolSites.flatMap((site) => site.tags))).sort(), [coolSites]);

  return { coolSites, tags, isLoading, error, revalidate };
}
