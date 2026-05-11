import { useCachedPromise } from "@raycast/utils";
import { getQueue } from "../api/getQueue";

export function useQueue() {
  const { data, error, isLoading, revalidate } = useCachedPromise(() => getQueue());
  return { queueData: data, queueError: error, queueIsLoading: isLoading, queueRevalidate: revalidate };
}
