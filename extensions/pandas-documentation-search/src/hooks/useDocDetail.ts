import { useCallback, useEffect, useState } from "react";
import { loadDocDetail, type DocumentationSourceMode, type ResolvedDocumentationSource } from "../lib/docs-source";
import type { InventoryItem } from "../lib/inventory";
import type { DocDetail } from "../lib/doc-detail";

interface UseDocDetailResult {
  data?: DocDetail;
  source?: ResolvedDocumentationSource;
  remoteError?: Error;
  isLoading: boolean;
  error?: Error;
  revalidate: () => void;
}

interface UseDocDetailOptions {
  inventorySource?: ResolvedDocumentationSource;
  item: InventoryItem | undefined;
  localDocsDirectory?: string;
  mode: DocumentationSourceMode;
}

export function useDocDetail({
  inventorySource,
  item,
  localDocsDirectory,
  mode,
}: UseDocDetailOptions): UseDocDetailResult {
  const [result, setResult] = useState<{
    data?: DocDetail;
    source?: ResolvedDocumentationSource;
    remoteError?: Error;
    error?: Error;
  }>({});
  const [isLoading, setIsLoading] = useState(Boolean(item));
  const [reloadToken, setReloadToken] = useState(0);

  const revalidate = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    setResult({});

    if (!item) {
      setIsLoading(false);
      return;
    }

    let isActive = true;
    const selectedItem = item;

    async function run() {
      setIsLoading(true);
      try {
        const loaded = await loadDocDetail({
          inventorySource,
          item: selectedItem,
          localDocsDirectory,
          mode,
        });
        if (!isActive) {
          return;
        }
        setResult({
          data: loaded.data,
          source: loaded.source,
          remoteError: loaded.remoteError,
        });
      } catch (error) {
        if (!isActive) {
          return;
        }
        setResult((current) => ({
          ...current,
          error: error instanceof Error ? error : new Error(String(error)),
        }));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      isActive = false;
    };
  }, [inventorySource, item, localDocsDirectory, mode, reloadToken]);

  return { ...result, isLoading, revalidate };
}
