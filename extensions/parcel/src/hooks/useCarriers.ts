import { useFetch } from "@raycast/utils";
import { Carrier, getSupportedCarriersUrl } from "../api";

export function useCarriers() {
  const { data, isLoading, error, revalidate } = useFetch<Carrier[]>(getSupportedCarriersUrl(), {
    parseResponse: async (response) => {
      const json = (await response.json()) as Record<string, string>;
      return Object.entries(json)
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  return { carriers: data ?? [], isLoading, error, revalidate };
}
