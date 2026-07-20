import { useCallback, useEffect, useState } from "react";
import { loadInventory, type DocumentationSourceMode, type ResolvedDocumentationSource } from "../lib/docs-source";
import type { InventoryItem } from "../lib/inventory";

interface UseInventoryResult {
  data?: InventoryItem[];
  source?: ResolvedDocumentationSource;
  remoteError?: Error;
  isLoading: boolean;
  error?: Error;
  revalidate: () => void;
}

interface UseInventoryOptions {
  localDocsDirectory?: string;
  mode: DocumentationSourceMode;
}

export function useInventory({ localDocsDirectory, mode }: UseInventoryOptions): UseInventoryResult {
  const [result, setResult] = useState<{
    data?: InventoryItem[];
    source?: ResolvedDocumentationSource;
    remoteError?: Error;
    error?: Error;
  }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const revalidate = useCallback(() => setReloadToken((current) => current + 1), []);

  useEffect(() => {
    let isActive = true;

    async function run() {
      setIsLoading(true);
      try {
        const loaded = await loadInventory({ localDocsDirectory, mode });
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
  }, [localDocsDirectory, mode, reloadToken]);

  return { ...result, isLoading, revalidate };
}
