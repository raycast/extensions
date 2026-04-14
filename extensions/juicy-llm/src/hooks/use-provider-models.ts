import { useEffect, useState } from "react";
import { resolveCredentials } from "../ai";
import { fetchModels } from "../api/fetch-models";
import type { Provider, ProviderModel } from "../types";

const cache = new Map<Provider, ProviderModel[]>();

interface UseProviderModelsResult {
  models: ProviderModel[];
  isLoading: boolean;
  error: Error | undefined;
}

export function useProviderModels(
  provider: Provider | undefined,
): UseProviderModelsResult {
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>();

  useEffect(() => {
    if (!provider) {
      setModels([]);
      return;
    }

    const cached = cache.get(provider);
    if (cached) {
      setModels(cached);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(undefined);
    setModels([]);

    (async () => {
      try {
        const { apiKey, baseUrl } = await resolveCredentials(provider);
        const result = await fetchModels(provider, apiKey, baseUrl);
        if (!cancelled) {
          cache.set(provider, result);
          setModels(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [provider]);

  return { models, isLoading, error };
}
