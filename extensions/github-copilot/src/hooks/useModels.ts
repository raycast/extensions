import { useCachedPromise } from "@raycast/utils";
import { useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { getModels, Model } from "../services/models";

// Asynchronously load available coding agent models for a user
export const useModels = (): { models: Model[]; isLoading: boolean } => {
  const {
    data: models,
    isLoading,
    error,
  } = useCachedPromise(getModels, [], {
    initialData: null,
    keepPreviousData: false,
  });

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load models",
        message: error.message,
      });
    }
  }, [error]);

  return {
    models: models || [],
    isLoading,
  };
};
