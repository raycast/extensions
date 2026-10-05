import { useEffect, useState } from "react";
import type { InventoryItem } from "../lib/inventory";
import { loadDocDetail, type DocDetail } from "../lib/doc-detail";

interface UseDocDetailResult {
  data?: DocDetail;
  isLoading: boolean;
  error?: Error;
}

/**
 * Hook to load documentation detail for a specific inventory item.
 * The documentation is loaded from bundled markdown files.
 */
export function useDocDetail(item: InventoryItem | undefined): UseDocDetailResult {
  const [data, setData] = useState<DocDetail | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    if (!item) {
      setData(undefined);
      setIsLoading(false);
      setError(undefined);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(undefined);

    loadDocDetail(item)
      .then((detail) => {
        if (!cancelled) {
          setData(detail);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [item?.id]);

  return { data, isLoading, error };
}
