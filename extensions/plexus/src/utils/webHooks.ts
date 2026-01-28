import { useFetch } from "@raycast/utils";

export function useServiceIcon(url: string) {
  const faviconUrl = `${url}/favicon.ico`;
  const { isLoading, data, error } = useFetch<boolean | undefined>(faviconUrl, {
    method: "HEAD",
    execute: true,
    keepPreviousData: true,
    parseResponse: async (response) => (response.ok ? true : undefined),
  });

  return {
    isLoading,
    favicon: data ? faviconUrl : undefined,
    error,
  };
}

export function usePageTitle(url: string) {
  const { isLoading, data, error } = useFetch<string | undefined>(url, {
    execute: true,
    keepPreviousData: true,
    parseResponse: async (response) => (response.ok ? response.text() : undefined),
  });

  let title: string | undefined = undefined;
  if (data) {
    const html = data;
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
    }
  }

  return {
    isLoading,
    title,
    error,
  };
}
