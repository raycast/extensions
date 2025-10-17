"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSavedAddresses = getSavedAddresses;
exports.saveAddress = saveAddress;
exports.updateSavedAddress = updateSavedAddress;
exports.deleteSavedAddress = deleteSavedAddress;
exports.isAddressSaved = isAddressSaved;
exports.updateAddressLastUsed = updateAddressLastUsed;
exports.getSearchHistory = getSearchHistory;
exports.addToHistory = addToHistory;
exports.deleteHistoryItem = deleteHistoryItem;
exports.clearSearchHistory = clearSearchHistory;
exports.exportAsJSON = exportAsJSON;
exports.exportAsCSV = exportAsCSV;
exports.exportSavedAddressesAsMarkdown = exportSavedAddressesAsMarkdown;
exports.exportHistoryAsMarkdown = exportHistoryAsMarkdown;
const api_1 = require("@raycast/api");
// Saved Addresses Storage
async function getSavedAddresses() {
    try {
        const data = await api_1.LocalStorage.getItem("saved-addresses");
        return data ? JSON.parse(data) : [];
    }
    catch (error) {
        console.error("Error loading saved addresses:", error);
        return [];
    }
}
async function saveAddress(address) {
    const addresses = await getSavedAddresses();
    addresses.push(address);
    await api_1.LocalStorage.setItem("saved-addresses", JSON.stringify(addresses));
}
async function updateSavedAddress(id, updates) {
    const addresses = await getSavedAddresses();
    const index = addresses.findIndex((a) => a.id === id);
    if (index !== -1) {
        addresses[index] = { ...addresses[index], ...updates, lastUsed: Date.now() };
        await api_1.LocalStorage.setItem("saved-addresses", JSON.stringify(addresses));
    }
}
async function deleteSavedAddress(id) {
    const addresses = await getSavedAddresses();
    const filtered = addresses.filter((a) => a.id !== id);
    await api_1.LocalStorage.setItem("saved-addresses", JSON.stringify(filtered));
}
async function isAddressSaved(address) {
    const addresses = await getSavedAddresses();
    return addresses.find((a) => a.address.toLowerCase() === address.toLowerCase()) || null;
}
async function updateAddressLastUsed(address) {
    const addresses = await getSavedAddresses();
    const found = addresses.find((a) => a.address.toLowerCase() === address.toLowerCase());
    if (found) {
        found.lastUsed = Date.now();
        await api_1.LocalStorage.setItem("saved-addresses", JSON.stringify(addresses));
    }
}
// Search History Storage
const MAX_HISTORY_ITEMS = 100;
async function getSearchHistory() {
    try {
        const data = await api_1.LocalStorage.getItem("search-history");
        return data ? JSON.parse(data) : [];
    }
    catch (error) {
        console.error("Error loading search history:", error);
        return [];
    }
}
async function addToHistory(item) {
    let history = await getSearchHistory();
    // Deduplicate: if same query + chain within last 5 minutes, don't add
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const isDuplicate = history.some((h) => h.query.toLowerCase() === item.query.toLowerCase() && h.chainId === item.chainId && h.timestamp > fiveMinutesAgo);
    if (!isDuplicate) {
        history.unshift(item); // Add to beginning
        // Keep only last MAX_HISTORY_ITEMS
        if (history.length > MAX_HISTORY_ITEMS) {
            history = history.slice(0, MAX_HISTORY_ITEMS);
        }
        await api_1.LocalStorage.setItem("search-history", JSON.stringify(history));
    }
}
async function deleteHistoryItem(id) {
    const history = await getSearchHistory();
    const filtered = history.filter((h) => h.id !== id);
    await api_1.LocalStorage.setItem("search-history", JSON.stringify(filtered));
}
async function clearSearchHistory() {
    await api_1.LocalStorage.setItem("search-history", JSON.stringify([]));
}
// Export to Clipboard as JSON
function exportAsJSON(data) {
    return JSON.stringify(data, null, 2);
}
// Export as CSV
function exportAsCSV(items) {
    if (items.length === 0)
        return "";
    const headers = Object.keys(items[0]).join(",");
    const rows = items.map((item) => {
        return Object.values(item)
            .map((value) => {
            if (Array.isArray(value))
                return `"${value.join("|")}"`;
            if (typeof value === "string" && value.includes(","))
                return `"${value}"`;
            return value;
        })
            .join(",");
    });
    return [headers, ...rows].join("\n");
}
// Export as Markdown
function exportSavedAddressesAsMarkdown(addresses) {
    if (addresses.length === 0)
        return "No saved addresses.";
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
function exportHistoryAsMarkdown(history) {
    if (history.length === 0)
        return "No search history.";
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
