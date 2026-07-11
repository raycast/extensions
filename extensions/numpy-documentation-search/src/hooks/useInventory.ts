import { useCallback, useEffect, useState } from "react";
import { loadInventory, type DocumentationSourceMode, type ResolvedDocumentationSource } from "../lib/docs-source";
import type { InventoryItem } from "../lib/inventory";

interface UseInventoryResult {
  data?: InventoryItem[];
  isLoading: boolean;
  error?: Error;
  remoteError?: Error;
  revalidate: () => void;
  source?: ResolvedDocumentationSource;
}

interface UseInventoryOptions {
  localDocsDirectory?: string;
  mode: DocumentationSourceMode;
}

export function useInventory(options: UseInventoryOptions): UseInventoryResult {
  const [reloadToken, setReloadToken] = useState(0);

  const revalidate = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const [state, setState] = useState<UseInventoryResult>({
    isLoading: true,
    revalidate,
  });

  useEffect(() => {
    let cancelled = false;

    setState((current) => ({
      ...current,
      isLoading: true,
      error: undefined,
      remoteError: undefined,
      revalidate,
    }));

    void loadInventory({
      localDocsDirectory: options.localDocsDirectory,
      mode: options.mode,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }

        setState({
          data: result.data,
          error: undefined,
          isLoading: false,
          remoteError: result.remoteError,
          revalidate,
          source: result.source,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setState((current) => ({
          ...current,
          error: error instanceof Error ? error : new Error(String(error)),
          isLoading: false,
          remoteError: undefined,
          revalidate,
          source: undefined,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [options.localDocsDirectory, options.mode, reloadToken, revalidate]);

  return state;
}
