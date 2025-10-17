import { LocalStorage } from "@raycast/api";

export interface SavedAddress {
  id: string;
  address: string;
  label: string;
  tags: string[];
  chains: number[]; // Associated chain IDs
  notes?: string;
  createdAt: number;
  lastUsed: number;
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  type: "address" | "transaction" | "block" | "ens" | "signature" | "token";
  chainId: number;
  chainName: string;
  timestamp: number;
  url?: string;
}

// Saved Addresses Storage
export async function getSavedAddresses(): Promise<SavedAddress[]> {
  try {
    const data = await LocalStorage.getItem<string>("saved-addresses");
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading saved addresses:", error);
    return [];
  }
}

export async function saveAddress(address: SavedAddress): Promise<void> {
  const addresses = await getSavedAddresses();
  addresses.push(address);
  await LocalStorage.setItem("saved-addresses", JSON.stringify(addresses));
}

export async function updateSavedAddress(id: string, updates: Partial<SavedAddress>): Promise<void> {
  const addresses = await getSavedAddresses();
  const index = addresses.findIndex((a) => a.id === id);
  if (index !== -1) {
    addresses[index] = { ...addresses[index], ...updates, lastUsed: Date.now() };
    await LocalStorage.setItem("saved-addresses", JSON.stringify(addresses));
  }
}

export async function deleteSavedAddress(id: string): Promise<void> {
  const addresses = await getSavedAddresses();
  const filtered = addresses.filter((a) => a.id !== id);
  await LocalStorage.setItem("saved-addresses", JSON.stringify(filtered));
}

export async function isAddressSaved(address: string): Promise<SavedAddress | null> {
  const addresses = await getSavedAddresses();
  return addresses.find((a) => a.address.toLowerCase() === address.toLowerCase()) || null;
}

export async function updateAddressLastUsed(address: string): Promise<void> {
  const addresses = await getSavedAddresses();
  const found = addresses.find((a) => a.address.toLowerCase() === address.toLowerCase());
  if (found) {
    found.lastUsed = Date.now();
    await LocalStorage.setItem("saved-addresses", JSON.stringify(addresses));
  }
}

// Search History Storage
const MAX_HISTORY_ITEMS = 100;

export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  try {
    const data = await LocalStorage.getItem<string>("search-history");
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error loading search history:", error);
    return [];
  }
}

export async function addToHistory(item: SearchHistoryItem): Promise<void> {
  let history = await getSearchHistory();

  // Deduplicate: if same query + chain within last 5 minutes, don't add
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  const isDuplicate = history.some(
    (h) =>
      h.query.toLowerCase() === item.query.toLowerCase() && h.chainId === item.chainId && h.timestamp > fiveMinutesAgo,
  );

  if (!isDuplicate) {
    history.unshift(item); // Add to beginning
    // Keep only last MAX_HISTORY_ITEMS
    if (history.length > MAX_HISTORY_ITEMS) {
      history = history.slice(0, MAX_HISTORY_ITEMS);
    }
    await LocalStorage.setItem("search-history", JSON.stringify(history));
  }
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const history = await getSearchHistory();
  const filtered = history.filter((h) => h.id !== id);
  await LocalStorage.setItem("search-history", JSON.stringify(filtered));
}

export async function clearSearchHistory(): Promise<void> {
  await LocalStorage.setItem("search-history", JSON.stringify([]));
}

// Export to Clipboard as JSON
export function exportAsJSON(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// Export as CSV
export function exportAsCSV(items: SavedAddress[] | SearchHistoryItem[]): string {
  if (items.length === 0) return "";

  const headers = Object.keys(items[0]).join(",");
  const rows = items.map((item) => {
    return Object.values(item)
      .map((value) => {
        if (Array.isArray(value)) return `"${value.join("|")}"`;
        if (typeof value === "string" && value.includes(",")) return `"${value}"`;
        return value;
      })
      .join(",");
  });

  return [headers, ...rows].join("\n");
}

// Export as Markdown
export function exportSavedAddressesAsMarkdown(addresses: SavedAddress[]): string {
  if (addresses.length === 0) return "No saved addresses.";

  let md = "# Saved Addresses\n\n";
  md += `Total: ${addresses.length}\n\n`;

  addresses.forEach((addr) => {
    md += `## ${addr.label}\n\n`;
    md += `- **Address**: \`${addr.address}\`\n`;
    md += `- **Tags**: ${addr.tags.length > 0 ? addr.tags.join(", ") : "None"}\n`;
    md += `- **Chains**: ${addr.chains.join(", ")}\n`;
    if (addr.notes) {
      md += `- **Notes**: ${addr.notes}\n`;
    }
    md += `- **Created**: ${new Date(addr.createdAt).toLocaleDateString()}\n`;
    md += `- **Last Used**: ${new Date(addr.lastUsed).toLocaleDateString()}\n\n`;
  });

  return md;
}

export function exportHistoryAsMarkdown(history: SearchHistoryItem[]): string {
  if (history.length === 0) return "No search history.";

  let md = "# Search History\n\n";
  md += `Total: ${history.length}\n\n`;

  history.forEach((item, index) => {
    md += `${index + 1}. **${item.type}** on ${item.chainName}\n`;
    md += `   - Query: \`${item.query}\`\n`;
    md += `   - Time: ${new Date(item.timestamp).toLocaleString()}\n`;
    if (item.url) {
      md += `   - URL: ${item.url}\n`;
    }
    md += `\n`;
  });

  return md;
}
