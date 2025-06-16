import { useFetch } from "@raycast/utils";
import { Cache } from "@raycast/api";
import { OpenRouterModel, OpenRouterModelsResponse } from "../types";
import { useState } from "react";
import { showFailureToast } from "@raycast/utils";

const DATA_STALE_TIME_IN_MILLISECONDS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Cache();

export function useModels(): {
  data: OpenRouterModel[] | undefined;
  isLoading: boolean;
  refresh: () => void;
} {
  const cached = cache.get("models");
  const lastFetchTime = Number(cache.get("lastFetchTime"));
  const isStale = !lastFetchTime || Date.now() - lastFetchTime > DATA_STALE_TIME_IN_MILLISECONDS;
  const { data, isLoading } = useFetch<OpenRouterModelsResponse>("https://openrouter.ai/api/v1/models", {
    execute: !cached || isStale,
    onError: (error) => {
      showFailureToast(`Failed to fetch models: ${error.message}`);
    },
  });
  const [refreshCount, setRefreshCount] = useState(0);

  const refresh = () => {
    cache.remove("models");
    cache.remove("lastFetchTime");
    setRefreshCount(refreshCount + 1);
  };

  // Validate the response structure
  if (data && (typeof data !== "object" || !data.data || !Array.isArray(data.data))) {
    showFailureToast("Response from OpenRouter contains invalid data");
    return { data: undefined, isLoading: false, refresh };
  }

  const allModels = data?.data;

  const currentTime = Date.now();
  if (cached && !isStale) {
    return { data: JSON.parse(cached) as OpenRouterModel[], isLoading: false, refresh };
  }

  if (isLoading || !allModels) {
    return { data: undefined, isLoading, refresh };
  }

  cache.set("models", JSON.stringify(allModels));
  cache.set("lastFetchTime", JSON.stringify(currentTime));

  return { data: allModels, isLoading, refresh };
}
