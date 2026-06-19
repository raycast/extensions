import { useCachedPromise } from "@raycast/utils";
import { createApiClient } from "../api";

export function useSupportedLanguages(execute = true) {
  const client = createApiClient();

  const { data, isLoading } = useCachedPromise(() => client.settings.getSupportedLanguages(), [], {
    keepPreviousData: true,
    execute,
  });

  return {
    supportedLanguages: data ?? [],
    isLoading,
  };
}
