import { useFetch } from "@raycast/utils";
import { BrandSearchResult } from "./types";

export const useSearch = (query: string) => {
  const url = `https://api.brandfetch.io/v2/search/${query}`;

  return useFetch<BrandSearchResult[]>(url, {
    execute: query?.length >= 3,
    headers: {
      accept: "application/json",
    },
  });
};
