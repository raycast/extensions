import { usePromise } from "@raycast/utils";
import { fetchCopilotUsage } from "../services/copilot";

export function useCopilotUsage() {
  const {
    isLoading,
    data: usage,
    error,
    revalidate,
  } = usePromise(fetchCopilotUsage, [], {
    execute: true,
  });

  return { isLoading, usage, error, revalidate };
}
