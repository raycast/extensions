import { useFetch } from "@raycast/utils";
import { itemsPerPage, scoreThreshold } from "@ts/constants";
import { TGalleryPage } from "@ts/types";

export default function useGallery({ search, token }: { search: string | undefined; token: string | undefined }): {
  page: TGalleryPage | undefined;
  pageError: Error | undefined;
  isLoadingPage: boolean;
} {
  const endpoint = "https://api.stablecog.com/v1/gallery";
  const url = new URL(endpoint);
  url.searchParams.append("per_page", itemsPerPage.toString());
  url.searchParams.append("score_threshold", scoreThreshold.toString());
  if (search) {
    url.searchParams.append("search", search);
  }
  const { data, error, isLoading } = useFetch<TGalleryPage>(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  return { page: data, pageError: error, isLoadingPage: isLoading };
}
