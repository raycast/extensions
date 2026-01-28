import { Appliance, Cloud } from "nature-remo";
import { getPreferences } from "./preferences";
import { useCache } from "./useCache";
import { useQuery } from "./useQuery";

export function useAppliances() {
  const getAppliancesWithCache = useCache(getAppliances, "appliances", 5 * 60 * 1000);

  const { data, isLoading } = useQuery(getAppliancesWithCache);

  return {
    appliances: data || [],
    isLoading,
  };
}

export async function getAppliances(): Promise<Appliance[]> {
  const { apiKey } = getPreferences();
  const client = new Cloud(apiKey);

  return await client.getAppliances();
}
