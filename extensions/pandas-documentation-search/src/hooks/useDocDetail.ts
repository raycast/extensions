import { useFetch } from "@raycast/utils";
import type { InventoryItem } from "../lib/inventory";
import { parseDocDetail, type DocDetail } from "../lib/doc-detail";

interface UseDocDetailResult {
  data?: DocDetail;
  isLoading: boolean;
  error?: Error;
  revalidate: () => void;
}

export function useDocDetail(item: InventoryItem | undefined): UseDocDetailResult {
  const { data, isLoading, error, revalidate } = useFetch<DocDetail>(item?.url ?? "", {
    execute: Boolean(item),
    keepPreviousData: true,
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load documentation: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      return parseDocDetail(html, item!);
    },
  });

  return { data, isLoading, error, revalidate };
}
