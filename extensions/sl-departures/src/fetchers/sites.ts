import { type Site as SiteType } from "../types/Site";
import { useLocalStorage } from "@raycast/utils";
import { useFetch } from "@raycast/utils";

const URL = "https://transport.integration.sl.se/v1/sites?expand=false";

export const useSites = () => {
  const {
    value: favorites,
    setValue: setFavorites,
    isLoading: isLoadingFavorites,
  } = useLocalStorage<number[]>("favorites", []);

  const { isLoading, data, revalidate } = useFetch<SiteType[]>(URL);

  const sortedData = (data ?? []).sort((a, b) => a.name.localeCompare(b.name, "sv", { sensitivity: "base" }));

  const { favoriteSites, sites } = (sortedData ?? []).reduce(
    (acc, site) => {
      if (favorites?.includes(site.id)) {
        acc.favoriteSites.push(site);
      } else {
        acc.sites.push(site);
      }
      return acc;
    },
    { favoriteSites: [] as SiteType[], sites: [] as SiteType[] },
  ) ?? { favoriteSites: [], sites: [] };

  return { isLoading, data: sites, favorites, favoriteSites, setFavorites, isLoadingFavorites, revalidate };
};
