import { useCachedPromise } from "@raycast/utils";
import { getProjects, getTags } from "./api/client";
import { showApiErrorToast } from "./lib/errors";

export function useProjects() {
  return useCachedPromise(getProjects, [], {
    keepPreviousData: true,
    onError: (error) => void showApiErrorToast(error),
  });
}

export function useTags() {
  return useCachedPromise(getTags, [], {
    keepPreviousData: true,
    onError: (error) => void showApiErrorToast(error),
  });
}
