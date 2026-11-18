import { useCallback, useEffect, useState } from "react";
import { loadDocDetail, type DocumentationSourceMode, type ResolvedDocumentationSource } from "../lib/docs-source";
import type { DocDetail } from "../lib/doc-detail";
import type { InventoryItem } from "../lib/inventory";

interface UseDocDetailResult {
  data?: DocDetail;
  isLoading: boolean;
  error?: Error;
  revalidate: () => void;
  source?: ResolvedDocumentationSource;
}

interface UseDocDetailOptions {
  inventorySource?: ResolvedDocumentationSource;
  item: InventoryItem | undefined;
  localDocsDirectory?: string;
  mode: DocumentationSourceMode;
}

export function useDocDetail(options: UseDocDetailOptions): UseDocDetailResult {
  const [reloadToken, setReloadToken] = useState(0);

  const revalidate = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  const [state, setState] = useState<UseDocDetailResult>({
    isLoading: false,
    revalidate,
  });

  useEffect(() => {
    let cancelled = false;

    if (!options.item || !options.inventorySource) {
      setState({
        data: undefined,
        error: undefined,
        isLoading: false,
        revalidate,
        source: undefined,
      });
      return () => {
        cancelled = true;
      };
    }

    setState((current) => ({
      ...current,
      error: undefined,
      isLoading: true,
      revalidate,
    }));

    void loadDocDetail({
      inventorySource: options.inventorySource,
      item: options.item,
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
          revalidate,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [options.inventorySource, options.item, options.localDocsDirectory, options.mode, reloadToken, revalidate]);

  return state;
}
