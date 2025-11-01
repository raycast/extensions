import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { parseLinkHeader } from "@web3-storage/parse-link-header";

const preferences = getPreferenceValues<Preferences>();

export function sbData<T>(route: string) {
  const { isLoading, data, revalidate } = useFetch<T>(`${preferences.apiLocation}/v1/${route}?per_page=100`, {
    headers: {
      Authorization: preferences.accessToken,
    },
  });

  return { isLoading, data, revalidate };
}

export function useStoryblokDataPaginated<T>(route: string) {
  const { isLoading, data, pagination } = useFetch(
    (options) =>
      `${preferences.apiLocation}/v1/${route}?` +
      new URLSearchParams({
        per_page: "100",
        page: String(options.page + 1),
      }).toString(),
    {
      headers: {
        Authorization: preferences.accessToken,
        "Content-Type": "application/json",
      },
      async parseResponse(response) {
        if (!response.ok) throw new Error(response.statusText);
        const parsed = parseLinkHeader(response.headers.get("Link"));
        const hasMore = parsed && "next" in parsed;
        const data = (await response.json()) as { [key: string]: T[] };
        return {
          data,
          hasMore,
        };
      },
      mapResult(result) {
        const key = route.split("/").at(-1); // e.g. route='spaces/ID/assets` -> { assets: asset[] } ;
        return {
          data: result.data[key as keyof typeof result.data],
          hasMore: !!result.hasMore,
        };
      },
      initialData: [],
    },
  );

  return { isLoading, data, pagination };
}
