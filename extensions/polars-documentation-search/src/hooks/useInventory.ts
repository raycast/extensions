import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { loadInventory, type ResolvedDocumentationSource, type SourcePreferences } from "../lib/docs-source";
import { type InventoryItem } from "../lib/inventory";

interface UseInventoryResult {
  data?: InventoryItem[];
  isLoading: boolean;
  error?: Error;
  source?: ResolvedDocumentationSource;
  remoteError?: Error;
  revalidate: () => void;
}

export function useInventory(preferences: SourcePreferences = getPreferenceValues<Preferences>()): UseInventoryResult {
  const [data, setData] = useState<InventoryItem[] | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();
  const [source, setSource] = useState<ResolvedDocumentationSource | undefined>();
  const [remoteError, setRemoteError] = useState<Error | undefined>();
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function run() {
      setIsLoading(true);
      setError(undefined);

      try {
        const result = await loadInventory(preferences);
        if (isCancelled) {
          return;
        }

        setData(result.items);
        setSource(result.source);
        setRemoteError(result.remoteError);
      } catch (caughtError) {
        if (isCancelled) {
          return;
        }

        setError(caughtError instanceof Error ? caughtError : new Error(String(caughtError)));
        setSource(undefined);
        setRemoteError(undefined);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      isCancelled = true;
    };
  }, [preferences.documentationSource, preferences.localDocsDirectory, reloadToken]);

  const revalidate = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  return { data, isLoading, error, source, remoteError, revalidate };
}
