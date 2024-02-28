import { useFetch } from "@raycast/utils";
import { itemsPerPage, scoreThreshold } from "@ts/constants";
import { TGalleryPage, THistoryFilter, THistoryPage } from "@ts/types";

export default function useHistory({
  search,
  token,
  filter,
}: {
  search: string | undefined;
  token: string | undefined;
  filter: THistoryFilter;
}): {
  historyPage: TGalleryPage | undefined;
  historyPageError: Error | undefined;
  isLoadingHistoryPage: boolean;
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
  const { data, error, isLoading } = useFetch<THistoryPage>(url.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  let dataAsGalleryPage: TGalleryPage | undefined;
  if (data) {
    dataAsGalleryPage = {
      next: data.next,
      hits: data.outputs.map((output) => ({
        width: output.generation.width,
        height: output.generation.height,
        id: output.id,
        image_url: output.image_url,
        upscaled_image_url: output.upscaled_image_url,
        prompt_text: output.generation.prompt.text,
        guidance_scale: output.generation.guidance_scale,
        inference_steps: output.generation.inference_steps,
        model_id: output.generation.model_id,
        scheduler_id: output.generation.scheduler_id,
      })),
    };
  } else {
    dataAsGalleryPage = undefined;
  }
  if (!token) {
    return { historyPage: undefined, historyPageError: undefined, isLoadingHistoryPage: true };
  }
  return { historyPage: dataAsGalleryPage, historyPageError: error, isLoadingHistoryPage: isLoading };
}
