import { useFetch } from "@raycast/utils";
import { itemsPerPage, scoreThreshold } from "@ts/constants";
import { TGalleryPage, THistoryFilter } from "@ts/types";

export default function useHistory({
  search,
  token,
  filter,
}: {
  search: string | undefined;
  token: string | undefined;
  filter: THistoryFilter;
}): {
  page: TGalleryPage | undefined;
  pageError: Error | undefined;
  isLoadingPage: boolean;
} {
  const endpoint = "https://api.stablecog.com/v1/image/generation/outputs";
  const url = new URL(endpoint);

  url.searchParams.append("per_page", itemsPerPage.toString());
  url.searchParams.append("score_threshold", scoreThreshold.toString());
  if (search) {
    url.searchParams.append("search", search);
  }
  if (filter === "favorites") {
    url.searchParams.append("is_favorited", "true");
  }
  const { data, error, isLoading } = useFetch<TGalleryPage>(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    execute: token !== undefined,
  });
  if (!token) {
    return { page: undefined, pageError: undefined, isLoadingPage: true };
  }
  return { page: data, pageError: error, isLoadingPage: isLoading };
}
