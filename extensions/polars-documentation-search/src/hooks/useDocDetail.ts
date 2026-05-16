import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import type { InventoryItem } from "../lib/inventory";
import { type DocDetail } from "../lib/doc-detail";
import { loadDocDetail, type ResolvedDocumentationSource } from "../lib/docs-source";

interface UseDocDetailResult {
  data?: DocDetail;
  isLoading: boolean;
  error?: Error;
  source?: ResolvedDocumentationSource;
  remoteError?: Error;
  revalidate: () => void;
}

export function useDocDetail(
  item: InventoryItem | undefined,
  inventorySource?: ResolvedDocumentationSource,
): UseDocDetailResult {
  const [data, setData] = useState<DocDetail | undefined>();
  const [isLoading, setIsLoading] = useState(Boolean(item));
  const [error, setError] = useState<Error | undefined>();
  const [source, setSource] = useState<ResolvedDocumentationSource | undefined>();
  const [remoteError, setRemoteError] = useState<Error | undefined>();
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function run() {
      if (!item) {
        setData(undefined);
        setError(undefined);
        setSource(undefined);
        setRemoteError(undefined);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(undefined);

      try {
        const result = await loadDocDetail(item, inventorySource, getPreferenceValues<Preferences>());
        if (isCancelled) {
          return;
        }

        setData(result.detail);
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
  }, [item, inventorySource, reloadToken]);

  const revalidate = useCallback(() => {
    setReloadToken((current) => current + 1);
  }, []);

  return { data, isLoading, error, source, remoteError, revalidate };
}
