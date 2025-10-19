import inventoryData from "../../assets/docs/inventory.json";

export interface InventoryItem {
  id: string;
  name: string;
  role: string;
  category: string;
  url: string;
  docPath: string;
  description: string;
}

/**
 * Load the inventory from the local JSON file.
 * This function does not access the web - all data is bundled with the extension.
 */
export function loadInventory(): InventoryItem[] {
  // The inventory is loaded at build time from the JSON file
  const items = inventoryData as InventoryItem[];

  // Sort by name for consistent ordering
  items.sort((a, b) => a.name.localeCompare(b.name));

  return items;
}
