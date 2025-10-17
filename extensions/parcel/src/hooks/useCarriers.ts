import { useFetch } from "@raycast/utils";
import { Carrier, getSupportedCarriersUrl } from "../api";

export function useCarriers() {
  const { data, isLoading, error, revalidate } = useFetch<Record<string, string>>(getSupportedCarriersUrl());

  const carriers: Carrier[] = data
    ? Object.entries(data)
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return { carriers, isLoading, error, revalidate };
}
