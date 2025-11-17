import { useFetch } from "@raycast/utils";
import { INVENTORY_URL, transformInventoryResponse, type InventoryItem } from "../lib/inventory";

interface UseInventoryResult {
  data?: InventoryItem[];
  isLoading: boolean;
  error?: Error;
  revalidate: () => void;
}

export function useInventory(): UseInventoryResult {
  const { data, isLoading, error, revalidate } = useFetch<InventoryItem[]>(INVENTORY_URL, {
    keepPreviousData: true,
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load NumPy inventory: ${response.status} ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      return transformInventoryResponse(buffer);
    },
  });

  return { data, isLoading, error, revalidate };
}
