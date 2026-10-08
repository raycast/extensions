import { useMemo } from "react";
import { loadInventory, type InventoryItem } from "../lib/inventory";

interface UseInventoryResult {
  data: InventoryItem[];
  isLoading: boolean;
  error?: Error;
}

/**
 * Hook to load the inventory from the bundled JSON file.
 * Since the data is bundled with the extension, this doesn't require network access.
 */
export function useInventory(): UseInventoryResult {
  const data = useMemo(() => {
    try {
      return loadInventory();
    } catch (error) {
      console.error("Failed to load inventory:", error);
      return [];
    }
  }, []);

  // Since we're loading from bundled data, there's no loading state
  return {
    data,
    isLoading: false,
    error: undefined,
  };
}
