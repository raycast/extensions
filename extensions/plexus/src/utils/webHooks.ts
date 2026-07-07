import { useFetch } from "@raycast/utils";

export function useServiceIcon(url: string) {
  const faviconUrl = `${url}/favicon.ico`;
  const { isLoading, data, error } = useFetch<boolean | undefined>(faviconUrl, {
    method: "HEAD",
    execute: true,
    keepPreviousData: false,
    parseResponse: async (response) => (response.ok ? true : undefined),
  });

  return {
    isLoading,
    favicon: data ? faviconUrl : undefined,
    error,
  };
}
