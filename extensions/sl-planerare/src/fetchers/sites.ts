import { useFetch } from "@raycast/utils";
import { Site as SiteType } from "../types/Site";

const URL = "https://transport.integration.sl.se/v1/sites?expand=false";

export const useSites = () => {
  const { isLoading, data, revalidate } = useFetch<SiteType[]>(URL);
  const sortedData = (data ?? []).sort((a, b) => a.name.localeCompare(b.name, "sv", { sensitivity: "base" }));

  return { isLoading, data: sortedData, revalidate };
};
