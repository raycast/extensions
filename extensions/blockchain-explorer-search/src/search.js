"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Command;
const jsx_runtime_1 = require("react/jsx-runtime");
const api_1 = require("@raycast/api");
const react_1 = require("react");
const matchers_1 = require("./matchers");
const chains = __importStar(require("viem/chains"));
const custom_chains_1 = require("./custom-chains");
const blockchain_utils_1 = require("./utils/blockchain-utils");
const address_detail_1 = require("./components/address-detail");
const storage_1 = require("./utils/storage");
const save_address_form_1 = __importDefault(require("./components/save-address-form"));
const createExplorersFromChains = () => {
    const allChains = [...Object.values(chains), ...custom_chains_1.customChains];
    // Deduplicate by chainId, keeping the first occurrence
    const uniqueChains = Array.from(new Map(allChains.map((chain) => [chain.id, chain])).values());
    return uniqueChains
        .filter((chain) => chain.blockExplorers?.default !== undefined)
        .map((chain) => {
        if (!chain.blockExplorers?.default) {
            throw new Error("Chain should have default explorer");
        }
        const explorer = {
            chainName: chain.name,
            explorerName: chain.blockExplorers.default.name || "Block Explorer",
            baseUrl: chain.blockExplorers.default.url.replace(/^https?:\/\//, ""),
            chainId: chain.id,
            currency: chain.nativeCurrency.symbol,
            iconUri: `../assets/${chain.name}.svg`,
            testNet: chain.testnet || false,
            imageUrl: chain.blockExplorers.default.url + "/images/logo.svg",
        };
        return explorer;
    });
};
// Load user-added chains from LocalStorage and merge with built-in explorers
async function getAllExplorers() {
    const builtInExplorers = createExplorersFromChains();
    try {
        const userChainsJson = await api_1.LocalStorage.getItem("user-custom-chains");
        const userChains = userChainsJson ? JSON.parse(userChainsJson) : [];
        return [...builtInExplorers, ...userChains];
    }
    catch (error) {
        console.error("Error loading user chains:", error);
        return builtInExplorers;
    }
}
const explorers = createExplorersFromChains();
const defaultExplorer = explorers.find((explorer) => explorer.chainId === 1) || explorers[0];
// Simple in-memory cache for Routescan API responses
const routescanCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
// Function to check the Routescan API
async function checkRoutescan(query) {
    // Don't make requests for invalid or overly long queries
    // Minimum 3 characters for API calls
    const minApiQueryLength = 3;
    const maxQueryLength = 200; // Allow up to 200 characters for flexibility
    if (!query || query.length < minApiQueryLength || query.length > maxQueryLength)
        return null;
    // Check cache first
    const cached = routescanCache.get(query.toLowerCase());
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`[Routescan] Cache hit for query: ${query.slice(0, 10)}...`);
        return cached.data;
    }
    const startTime = Date.now();
    try {
        // Remove filter parameters that were causing 500 errors
        const url = `https://cdn-canary.routescan.io/api/search?query=${query}&limit=10&chainId=all&ecosystem=all`;
        console.log(`[Routescan] Fetching: ${query.slice(0, 10)}...`);
        const response = await fetch(url);
        const fetchTime = Date.now() - startTime;
        // Silently fail on API errors - Routescan is an optional enhancement
        if (!response.ok) {
            console.log(`[Routescan] API error ${response.status} after ${fetchTime}ms`);
            return null;
        }
        const data = (await response.json());
        const totalTime = Date.now() - startTime;
        console.log(`[Routescan] Success in ${totalTime}ms - tokens: ${data.erc20?.items?.length || 0}, addresses: ${data.addresses?.items?.length || 0}`);
        // Cache the successful response
        routescanCache.set(query.toLowerCase(), { data, timestamp: Date.now() });
        return data;
    }
    catch (err) {
        const totalTime = Date.now() - startTime;
        console.error(`[Routescan] Error after ${totalTime}ms:`, err);
        // Silently fail - Routescan is an optional enhancement feature
        // The extension will continue to work with manual chain selection
        return null;
    }
}
// Function to find the explorer by chain ID
function findExplorerByChainId(chainId) {
    const numericChainId = typeof chainId === "string" ? parseInt(chainId, 10) : chainId;
    return explorers.find((e) => e.chainId === numericChainId);
}
// Get relative time string
function getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60)
        return "just now";
    if (minutes < 60)
        return `${minutes}m ago`;
    if (hours < 24)
        return `${hours}h ago`;
    if (days < 7)
        return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}
function Command() {
    const [selectedExplorer, setSelectedExplorer] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [searchText, setSearchText] = (0, react_1.useState)("");
    const [hasInitialized, setHasInitialized] = (0, react_1.useState)(false);
    const [textSource, setTextSource] = (0, react_1.useState)("manual");
    const [matches, setMatches] = (0, react_1.useState)([]);
    const [routescanResults, setRoutescanResults] = (0, react_1.useState)(null);
    const [routescanLoading, setRoutescanLoading] = (0, react_1.useState)(false);
    const [allExplorers, setAllExplorers] = (0, react_1.useState)(explorers);
    const [searchHistory, setSearchHistory] = (0, react_1.useState)([]);
    const [savedAddressesMap, setSavedAddressesMap] = (0, react_1.useState)(new Map());
    const { push } = (0, api_1.useNavigation)();
    (0, react_1.useEffect)(() => {
        const loadExplorer = async () => {
            try {
                setIsLoading(true);
                // Load all explorers (built-in + user-added)
                const loadedExplorers = await getAllExplorers();
                setAllExplorers(loadedExplorers);
                // Load custom configs
                const customConfigsJson = await api_1.LocalStorage.getItem("custom-explorer-configs");
                const customConfigs = customConfigsJson ? JSON.parse(customConfigsJson) : {};
                const explorerFromStorage = await api_1.LocalStorage.getItem("selected-explorer");
                if (explorerFromStorage) {
                    try {
                        const parsedExplorer = JSON.parse(explorerFromStorage);
                        // Apply custom config if available
                        if (customConfigs[parsedExplorer.chainId]) {
                            parsedExplorer.config = customConfigs[parsedExplorer.chainId];
                        }
                        setSelectedExplorer(parsedExplorer);
                    }
                    catch (error) {
                        console.error("Error parsing explorer:", error);
                        setSelectedExplorer(defaultExplorer);
                        (0, api_1.showToast)({ title: "Error", message: "Failed to load selected explorer" });
                    }
                }
                else {
                    setSelectedExplorer(defaultExplorer);
                }
                // Load search history
                const history = await (0, storage_1.getSearchHistory)();
                setSearchHistory(history);
                // Load saved addresses into map for quick lookup
                const { getSavedAddresses } = await Promise.resolve().then(() => __importStar(require("./utils/storage")));
                const savedAddresses = await getSavedAddresses();
                const addressMap = new Map();
                savedAddresses.forEach((addr) => {
                    addressMap.set(addr.address.toLowerCase(), addr);
                });
                setSavedAddressesMap(addressMap);
            }
            catch (error) {
                console.error("Error loading explorer:", error);
                setSelectedExplorer(defaultExplorer);
            }
            finally {
                setIsLoading(false);
            }
        };
        loadExplorer();
    }, []);
    (0, react_1.useEffect)(() => {
        if (!selectedExplorer || !searchText) {
            setMatches([]);
            return;
        }
        // Allow searching with any text length - let matchers decide if they match
        // This enables short searches like "ggp", "eth", block numbers, etc.
        const possibleMatches = [
            new matchers_1.SignatureMatch(searchText, selectedExplorer),
            new matchers_1.TransactionMatch(searchText, selectedExplorer),
            new matchers_1.AddressMatch(searchText, selectedExplorer),
            new matchers_1.ENSMatch(searchText, selectedExplorer),
            new matchers_1.BlockMatch(searchText, selectedExplorer),
        ];
        // Filter for matches that actually match the search text
        const validMatches = possibleMatches.filter((match) => match.match());
        setMatches(validMatches);
        // Track to history when we find matches (minimum 3 chars to avoid tracking typos)
        if (validMatches.length > 0 && searchText.length >= 3) {
            const firstMatch = validMatches[0];
            trackSearch(searchText, firstMatch.matchType, firstMatch.path);
        }
    }, [searchText, selectedExplorer]);
    // Note: This function was removed to reduce API spam and prevent duplicate calls.
    // All API calls are now handled by the debounced useEffect hook below.
    // Effect to check Routescan API when search text changes
    (0, react_1.useEffect)(() => {
        let isMounted = true;
        let isLoadingRef = false; // Use ref to track loading without adding to dependencies
        const checkApi = async () => {
            // Minimum 3 characters for Routescan API calls
            const minApiQueryLength = 3;
            const maxQueryLength = 200;
            if (!searchText || searchText.length < minApiQueryLength || searchText.length > maxQueryLength) {
                if (isMounted) {
                    setRoutescanResults(null);
                    setRoutescanLoading(false);
                }
                return;
            }
            // Avoid duplicate API calls if we're already loading
            if (isLoadingRef) {
                console.log("[Routescan] Skipping duplicate call - already loading");
                return;
            }
            isLoadingRef = true;
            if (isMounted)
                setRoutescanLoading(true);
            const results = await checkRoutescan(searchText);
            console.log("[Routescan] Setting results and loading=false");
            if (isMounted) {
                setRoutescanResults(results);
                setRoutescanLoading(false);
                isLoadingRef = false;
                // If we found a transaction on a specific chain, automatically switch to that chain's explorer
                if (results?.evmTransactions?.items?.length) {
                    const txChainId = results.evmTransactions.items[0].chainId;
                    const chainExplorer = findExplorerByChainId(txChainId);
                    if (chainExplorer && selectedExplorer?.chainId !== parseInt(txChainId, 10)) {
                        handleExplorerChange(chainExplorer);
                        (0, api_1.showToast)({
                            title: "Chain Detected",
                            message: `Transaction found on ${chainExplorer.chainName}`,
                        });
                    }
                }
            }
        };
        // Use a delay to prevent too many API calls
        const timeoutId = setTimeout(() => {
            checkApi();
        }, 300);
        return () => {
            isMounted = false;
            clearTimeout(timeoutId);
        };
    }, [searchText, selectedExplorer]);
    // Helper function to check if text looks like blockchain data
    const looksLikeBlockchainData = (text) => {
        if (!text || text.length < 10)
            return false;
        // Remove whitespace and newlines
        const cleaned = text.trim().replace(/\s+/g, "");
        // Too long - probably not blockchain data
        if (cleaned.length > 200)
            return false;
        // Check for common patterns:
        // - Hex addresses/txns (0x...)
        // - Base58 (Solana, Bitcoin)
        // - ENS names (.eth)
        // - Pure numbers (block heights)
        const patterns = [
            /^0x[a-fA-F0-9]{40,64}$/, // EVM addresses/transactions
            /^[1-9A-HJ-NP-Za-km-z]{32,88}$/, // Base58 (Solana, Bitcoin)
            /\.eth$/i, // ENS names
            /^\d{1,15}$/, // Block numbers
            /^(bc1|1|3)[a-zA-Z0-9]{25,62}$/, // Bitcoin addresses
        ];
        return patterns.some((pattern) => pattern.test(cleaned));
    };
    // Load initial text from selected text or clipboard - only once on mount
    (0, react_1.useEffect)(() => {
        if (hasInitialized)
            return;
        let mounted = true;
        const loadInitialText = async () => {
            try {
                // Try to get selected text first
                const selectedText = await (0, api_1.getSelectedText)();
                if (mounted && selectedText && selectedText.length > 0) {
                    // Only auto-populate if it looks like blockchain data
                    if (looksLikeBlockchainData(selectedText)) {
                        setSearchText(selectedText.trim());
                        setTextSource("selected");
                        (0, api_1.showToast)({
                            title: "Selected Text Detected",
                            message: "Populated from highlighted text",
                        });
                        setHasInitialized(true);
                        return;
                    }
                }
            }
            catch {
                // If no selected text, try clipboard
            }
            // Don't auto-populate from clipboard - let user see recent searches
            // They can manually paste if needed
            if (mounted) {
                setHasInitialized(true);
            }
        };
        loadInitialText();
        return () => {
            mounted = false;
        };
    }, [hasInitialized]); // Only run when hasInitialized changes
    // Handle when an item is selected or hovered
    // Note: Removed redundant API calls here to reduce request spam
    // The main useEffect hook with debouncing handles all API calls
    // This prevents duplicate requests and respects rate limits
    const handleItemAction = () => {
        // Intentionally empty - kept for backwards compatibility
    };
    // Track search in history
    const trackSearch = async (query, type, url) => {
        if (!selectedExplorer)
            return;
        const historyItem = {
            id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            query,
            type,
            chainId: selectedExplorer.chainId,
            chainName: selectedExplorer.chainName,
            timestamp: Date.now(),
            url,
        };
        await (0, storage_1.addToHistory)(historyItem);
        const updatedHistory = await (0, storage_1.getSearchHistory)();
        setSearchHistory(updatedHistory);
    };
    const handleExplorerChange = async (explorer) => {
        try {
            // Load custom config if available
            const customConfigsJson = await api_1.LocalStorage.getItem("custom-explorer-configs");
            const customConfigs = customConfigsJson ? JSON.parse(customConfigsJson) : {};
            const explorerWithConfig = { ...explorer };
            if (customConfigs[explorer.chainId]) {
                explorerWithConfig.config = customConfigs[explorer.chainId];
            }
            await api_1.LocalStorage.setItem("selected-explorer", JSON.stringify(explorerWithConfig));
            setSelectedExplorer(explorerWithConfig);
            (0, api_1.showToast)({ title: "Explorer changed", message: `${explorer.chainName}` });
        }
        catch (error) {
            console.error("Error saving explorer:", error);
            (0, api_1.showToast)({ title: "Error", message: "Failed to save explorer selection" });
        }
    };
    // Function to render the detail markdown for the token
    const getTokenDetailMarkdown = (token) => {
        let markdown = `# ${token.name} (${token.symbol})\n\n`;
        // Add icon if available
        if (token.detail?.iconUrls?.["256"]) {
            markdown += `![Token Icon](${token.detail.iconUrls["256"]})\n\n`;
        }
        else if (token.detail?.icon) {
            markdown += `![Token Icon](${token.detail.icon})\n\n`;
        }
        markdown += `**Chain**: ${findExplorerByChainId(token.chainId)?.chainName || `Chain ID ${token.chainId}`}\n`;
        markdown += `**Address**: ${token.address}\n`;
        markdown += `**Decimals**: ${token.decimals !== undefined ? token.decimals.toString() : ""} \n`;
        if (token.market?.price) {
            markdown += `**Price**: $${token.market.price.toFixed(token.market.price < 1 ? 4 : 2)}`;
            if (token.market.priceChange24h !== undefined) {
                const changeEmoji = token.market.priceChange24h > 0 ? "📈" : "📉";
                markdown += ` (${token.market.priceChange24h > 0 ? "+" : ""}${token.market.priceChange24h.toFixed(2)}% ${changeEmoji})`;
            }
            markdown += `\n`;
        }
        if (token.marketCap) {
            markdown += `**Market Cap**: $${Number(token.marketCap).toLocaleString()}\n`;
        }
        if (token.detail?.description) {
            markdown += `\n## Description\n${token.detail.description}\n`;
        }
        if (token.detail?.tags && token.detail.tags.length > 0) {
            markdown += `\n## Tags\n${token.detail.tags.join(", ")}\n`;
        }
        if (token.detail?.social_profile?.items && token.detail.social_profile.items.length > 0) {
            markdown += `\n## Links\n`;
            token.detail.social_profile.items.forEach((item) => {
                if (item.type && item.value) {
                    markdown += `- [${item.type.charAt(0).toUpperCase() + item.type.slice(1)}](${item.value})\n`;
                }
            });
        }
        return markdown;
    };
    const handleSelectionChange = (id) => {
        // Note: Removed auto-population of searchText when selecting items.
        // This was causing the search bar to revert when users were trying to type.
        // Users can still click on items to open them without changing their search query.
        if (!id)
            return;
    };
    if (isLoading) {
        return (0, jsx_runtime_1.jsx)(api_1.List, { isLoading: true });
    }
    return ((0, jsx_runtime_1.jsxs)(api_1.List, { isLoading: isLoading || routescanLoading, searchText: searchText || "", onSearchTextChange: (text) => {
            setSearchText(text || "");
            // Reset source to manual when user types
            if (textSource !== "manual") {
                setTextSource("manual");
            }
        }, searchBarPlaceholder: `Search by Address / Transaction Hash / Block / ENS name`, throttle: true, onSelectionChange: handleSelectionChange, navigationTitle: "Blockchain Explorer Search", searchBarAccessory: (0, jsx_runtime_1.jsxs)(api_1.List.Dropdown, { tooltip: "Select Explorer", value: selectedExplorer ? selectedExplorer.chainId.toString() : "", onChange: (newValue) => {
                const explorer = allExplorers.find((e) => e.chainId.toString() === newValue);
                if (explorer) {
                    handleExplorerChange(explorer);
                }
            }, children: [(0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Section, { title: "Mainnets", children: allExplorers
                        .filter((explorer) => !explorer.testNet)
                        .sort((a, b) => a.chainName.localeCompare(b.chainName))
                        .map((explorer) => ((0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Item, { title: explorer.chainName, value: explorer.chainId.toString(), icon: { source: explorer.iconUri } }, explorer.chainId))) }), (0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Section, { title: "Testnets", children: allExplorers
                        .filter((explorer) => explorer.testNet)
                        .sort((a, b) => a.chainName.localeCompare(b.chainName))
                        .map((explorer) => ((0, jsx_runtime_1.jsx)(api_1.List.Dropdown.Item, { title: explorer.chainName, value: explorer.chainId.toString(), icon: { source: explorer.iconUri } }, explorer.chainId))) })] }), children: [searchHistory.length > 0 && !searchText && ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Recent Searches", subtitle: `Last ${Math.min(searchHistory.length, 10)} searches`, children: searchHistory.slice(0, 10).map((item) => {
                    const relativeTime = getRelativeTime(item.timestamp);
                    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { title: (0, blockchain_utils_1.shortenAddress)(item.query), subtitle: `${item.type} • ${item.chainName}`, icon: api_1.Icon.Clock, accessories: [{ text: relativeTime }], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Actions", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Search Again", icon: api_1.Icon.MagnifyingGlass, onAction: () => setSearchText(item.query) }), item.url && ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: item.url, title: "Open in Explorer", onOpen: () => trackSearch(item.query, item.type, item.url) }))] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Manage", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "Delete from History", icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["ctrl"], key: "x" }, onAction: async () => {
                                                await (0, storage_1.deleteHistoryItem)(item.id);
                                                const updatedHistory = await (0, storage_1.getSearchHistory)();
                                                setSearchHistory(updatedHistory);
                                                (0, api_1.showToast)({ title: "Deleted", message: "Removed from history" });
                                            } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Clear All History", icon: api_1.Icon.Trash, style: api_1.Action.Style.Destructive, shortcut: { modifiers: ["ctrl", "shift"], key: "x" }, onAction: async () => {
                                                await (0, storage_1.clearSearchHistory)();
                                                setSearchHistory([]);
                                                (0, api_1.showToast)({ title: "Cleared", message: "All history cleared" });
                                            } })] }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Copy", children: [(0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: item.query, title: "Copy Query" }), item.url && (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: item.url, title: "Copy URL" })] })] }) }, item.id));
                }) })), routescanResults?.evmTransactions?.items.length ? ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Detected Transactions", subtitle: "From Routescan", children: routescanResults.evmTransactions.items.map((tx, index) => {
                    const chainExplorer = findExplorerByChainId(tx.chainId);
                    const itemId = `tx-${index}`;
                    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: itemId, title: `Transaction: ${tx.hash.slice(0, 14)}...${tx.hash.slice(-8)}`, subtitle: chainExplorer?.chainName || `Chain ID ${tx.chainId}`, icon: chainExplorer?.iconUri || { source: api_1.Icon.Link }, accessories: [
                            { text: "Transaction", icon: api_1.Icon.Document },
                            { text: chainExplorer?.chainName || `Chain ID ${tx.chainId}`, icon: api_1.Icon.Link },
                        ], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [chainExplorer ? ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: `https://${chainExplorer.baseUrl}/tx/${tx.hash}`, title: "Open in Explorer", onOpen: () => handleItemAction() })) : ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: `https://routescan.io/transaction/${tx.hash}?chainId=${tx.chainId}`, title: "Open in Routescan", onOpen: () => handleItemAction() })), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: tx.hash, title: "Copy Hash", onCopy: () => handleItemAction() }), chainExplorer && selectedExplorer?.chainId !== parseInt(tx.chainId, 10) && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: `Switch to ${chainExplorer.chainName}`, icon: api_1.Icon.Switch, onAction: () => {
                                        handleExplorerChange(chainExplorer);
                                        handleItemAction();
                                    } }))] }) }, itemId));
                }) })) : null, routescanResults?.erc20?.items.length ? ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Detected Tokens", subtitle: "From Routescan", children: routescanResults.erc20.items.map((token, index) => {
                    const chainExplorer = findExplorerByChainId(token.chainId);
                    const itemId = `token-${index}`;
                    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: itemId, title: `${token.name} (${token.symbol})`, subtitle: chainExplorer?.chainName || `Chain ID ${token.chainId}`, icon: token.detail?.iconUrls?.["64"] || chainExplorer?.iconUri || { source: api_1.Icon.Coin }, accessories: [
                            ...(token.market?.price
                                ? [
                                    {
                                        text: `$${token.market.price.toFixed(token.market.price < 1 ? 4 : 2)}`,
                                        icon: api_1.Icon.Coin,
                                    },
                                ]
                                : [{ text: "Token", icon: api_1.Icon.Coin }]),
                            ...(token.market?.priceChange24h
                                ? [
                                    {
                                        text: `${token.market.priceChange24h > 0 ? "+" : ""}${token.market.priceChange24h.toFixed(2)}%`,
                                        icon: token.market.priceChange24h > 0 ? api_1.Icon.ChevronUp : api_1.Icon.ChevronDown,
                                    },
                                ]
                                : []),
                            { text: token.symbol, icon: api_1.Icon.Tag },
                        ], detail: (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail, { markdown: getTokenDetailMarkdown(token), metadata: (0, jsx_runtime_1.jsxs)(api_1.List.Item.Detail.Metadata, { children: [(0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Name", text: token.name }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Symbol", text: token.symbol }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Chain", text: chainExplorer?.chainName || `Chain ID ${token.chainId}` }), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Decimals", text: token.decimals !== undefined ? token.decimals.toString() : "" }), token.market?.price && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Price", text: `$${token.market.price.toFixed(token.market.price < 1 ? 4 : 2)}` }), token.market.priceChange24h !== undefined && ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "24h Change", text: `${token.market.priceChange24h > 0 ? "+" : ""}${token.market.priceChange24h.toFixed(2)}%`, icon: token.market.priceChange24h > 0 ? api_1.Icon.ChevronUp : api_1.Icon.ChevronDown }))] })), token.marketCap && ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Market Cap", text: `$${Number(token.marketCap).toLocaleString()}` })), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.Label, { title: "Contract Address", text: token.address }), token.detail?.tags && ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList, { title: "Tags", children: token.detail.tags.map((tag, idx) => ((0, jsx_runtime_1.jsx)(api_1.List.Item.Detail.Metadata.TagList.Item, { text: tag }, idx))) }))] }) }), actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [chainExplorer ? ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: `https://${chainExplorer.baseUrl}/token/${token.address}`, title: "Open in Explorer", onOpen: () => handleItemAction() })) : ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: `https://routescan.io/token/${token.address}?chainId=${token.chainId}`, title: "Open in Routescan", onOpen: () => handleItemAction() })), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: token.address, title: "Copy Address", onCopy: () => handleItemAction() }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: savedAddressesMap.has(token.address.toLowerCase()) ? "Edit Saved Token" : "Save Token", icon: savedAddressesMap.has(token.address.toLowerCase()) ? api_1.Icon.Pencil : api_1.Icon.Star, shortcut: { modifiers: ["cmd"], key: "s" }, onAction: async () => {
                                        const existing = await (0, storage_1.isAddressSaved)(token.address);
                                        const tokenChainId = parseInt(token.chainId, 10);
                                        push((0, jsx_runtime_1.jsx)(save_address_form_1.default, { address: token.address, chainId: tokenChainId, chainName: chainExplorer?.chainName || `Chain ${tokenChainId}`, allExplorers: allExplorers, existingEntry: existing || undefined, onSaved: async () => {
                                                // Reload saved addresses
                                                const { getSavedAddresses } = await Promise.resolve().then(() => __importStar(require("./utils/storage")));
                                                const savedAddresses = await getSavedAddresses();
                                                const addressMap = new Map();
                                                savedAddresses.forEach((addr) => {
                                                    addressMap.set(addr.address.toLowerCase(), addr);
                                                });
                                                setSavedAddressesMap(addressMap);
                                                (0, api_1.showToast)({ title: "Saved", message: `${token.name} saved` });
                                            } }));
                                    } }), chainExplorer && selectedExplorer?.chainId !== parseInt(token.chainId, 10) && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: `Switch to ${chainExplorer.chainName}`, icon: api_1.Icon.Switch, onAction: () => {
                                        handleExplorerChange(chainExplorer);
                                        handleItemAction();
                                    } })), token.detail?.social_profile?.items?.map((link, idx) => {
                                    if (link.type &&
                                        link.value &&
                                        (link.type === "url" ||
                                            link.type === "website" ||
                                            link.type === "twitter" ||
                                            link.type === "github" ||
                                            link.type === "coingecko")) {
                                        return ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: link.value, title: `Open ${link.type.charAt(0).toUpperCase() + link.type.slice(1)}`, onOpen: () => handleItemAction() }, idx));
                                    }
                                    return null;
                                })] }) }, itemId));
                }) })) : null, matches.length > 0 ? ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Selected Chain", subtitle: selectedExplorer?.chainName, children: matches.map((match, index) => {
                    const itemId = `match-${index}`;
                    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: itemId, title: match.title, icon: selectedExplorer?.iconUri, subtitle: match instanceof matchers_1.SignatureMatch
                            ? "Signature"
                            : match instanceof matchers_1.TransactionMatch
                                ? "Transaction"
                                : match instanceof matchers_1.AddressMatch
                                    ? "Address"
                                    : match instanceof matchers_1.ENSMatch
                                        ? "ENS"
                                        : "Block", actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [(0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Primary Actions", children: (0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: match.path, title: "Open in Explorer", onOpen: () => {
                                            handleItemAction();
                                            trackSearch(match.parsedSearch, match.matchType, match.path);
                                        } }) }), (0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Copy Actions", children: [(0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: match.parsedSearch, title: "Copy Value", shortcut: { modifiers: ["cmd"], key: "c" }, onCopy: () => (0, api_1.showToast)({ title: "Copied", message: "Copied to clipboard" }) }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: match.path, title: "Copy Explorer URL", shortcut: { modifiers: ["cmd", "shift"], key: "c" }, onCopy: () => (0, api_1.showToast)({ title: "Copied URL", message: "Explorer URL copied" }) }), match instanceof matchers_1.AddressMatch &&
                                            (() => {
                                                const variations = (0, blockchain_utils_1.getAddressVariations)(match.parsedSearch);
                                                return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [variations.checksummed && variations.checksummed !== match.parsedSearch && ((0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: variations.checksummed, title: "Copy Checksummed Address", icon: api_1.Icon.Check, onCopy: () => (0, api_1.showToast)({ title: "Copied", message: "Checksummed address copied" }) })), variations.withoutPrefix && ((0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: variations.withoutPrefix, title: "Copy Without 0X Prefix", icon: api_1.Icon.Minus, onCopy: () => (0, api_1.showToast)({ title: "Copied", message: "Address without prefix copied" }) })), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: variations.lowercase, title: "Copy Lowercase", icon: api_1.Icon.Text, onCopy: () => (0, api_1.showToast)({ title: "Copied", message: "Lowercase address copied" }) })] }));
                                            })()] }), match instanceof matchers_1.AddressMatch && selectedExplorer && ((0, jsx_runtime_1.jsxs)(api_1.ActionPanel.Section, { title: "Address Tools", children: [(0, jsx_runtime_1.jsx)(api_1.Action, { title: "View Address Details", icon: api_1.Icon.Info, shortcut: { modifiers: ["cmd"], key: "d" }, onAction: () => push((0, jsx_runtime_1.jsx)(address_detail_1.AddressDetail, { address: match.parsedSearch, explorer: selectedExplorer })) }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: savedAddressesMap.has(match.parsedSearch.toLowerCase())
                                                ? "Edit Saved Address"
                                                : "Save Address", icon: savedAddressesMap.has(match.parsedSearch.toLowerCase()) ? api_1.Icon.Pencil : api_1.Icon.Star, shortcut: { modifiers: ["cmd"], key: "s" }, onAction: async () => {
                                                const existing = await (0, storage_1.isAddressSaved)(match.parsedSearch);
                                                push((0, jsx_runtime_1.jsx)(save_address_form_1.default, { address: match.parsedSearch, chainId: selectedExplorer.chainId, chainName: selectedExplorer.chainName, allExplorers: allExplorers, existingEntry: existing || undefined, onSaved: async () => {
                                                        // Reload saved addresses
                                                        const { getSavedAddresses } = await Promise.resolve().then(() => __importStar(require("./utils/storage")));
                                                        const savedAddresses = await getSavedAddresses();
                                                        const addressMap = new Map();
                                                        savedAddresses.forEach((addr) => {
                                                            addressMap.set(addr.address.toLowerCase(), addr);
                                                        });
                                                        setSavedAddressesMap(addressMap);
                                                    } }));
                                            } }), (0, jsx_runtime_1.jsx)(api_1.Action, { title: "Copy Qr Code to Clipboard", icon: api_1.Icon.Code, shortcut: { modifiers: ["cmd", "shift"], key: "q" }, onAction: () => {
                                                api_1.Clipboard.copy(match.parsedSearch);
                                                (0, api_1.showToast)({
                                                    title: "Address Copied",
                                                    message: "Use Cmd+D to view QR code",
                                                });
                                            } }), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: `ethereum:${match.parsedSearch}`, title: "Copy as Payment Uri", icon: api_1.Icon.Link, onCopy: () => (0, api_1.showToast)({ title: "Copied", message: "Payment URI copied" }) })] })), (0, jsx_runtime_1.jsx)(api_1.ActionPanel.Section, { title: "Sharing", children: (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: `${selectedExplorer?.chainName}: ${(0, blockchain_utils_1.shortenAddress)(match.parsedSearch)}\n${match.path}`, title: "Copy Formatted for Sharing", icon: api_1.Icon.Document, shortcut: { modifiers: ["cmd", "shift"], key: "s" }, onCopy: () => (0, api_1.showToast)({ title: "Copied", message: "Formatted details copied" }) }) })] }) }, itemId));
                }) })) : searchText ? ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: routescanLoading ? "Searching..." : "No Matches Found", description: routescanLoading
                    ? "Checking blockchain data..."
                    : "Please enter a valid address, transaction hash, block number, or ENS name", icon: routescanLoading ? api_1.Icon.Clock : api_1.Icon.MagnifyingGlass })) : ((0, jsx_runtime_1.jsx)(api_1.List.EmptyView, { title: selectedExplorer ? "Enter Search Query" : "Select an Explorer First", description: selectedExplorer
                    ? "Enter an address, transaction hash, block number, or ENS name"
                    : "Use the dropdown above to select a blockchain explorer", icon: api_1.Icon.MagnifyingGlass })), routescanResults?.addresses?.items.length ? ((0, jsx_runtime_1.jsx)(api_1.List.Section, { title: "Detected Addresses", subtitle: "From Routescan", children: routescanResults.addresses.items.map((address, index) => {
                    const chainExplorer = findExplorerByChainId(address.chainId);
                    const itemId = `address-${index}`;
                    return ((0, jsx_runtime_1.jsx)(api_1.List.Item, { id: itemId, title: address.name || `Address: ${address.address.slice(0, 10)}...${address.address.slice(-8)}`, subtitle: chainExplorer?.chainName || `Chain ID ${address.chainId}`, icon: chainExplorer?.iconUri || { source: api_1.Icon.Person }, accessories: [
                            { text: address.type || "Address", icon: api_1.Icon.Person },
                            { text: chainExplorer?.chainName || `Chain ID ${address.chainId}`, icon: api_1.Icon.Link },
                        ], actions: (0, jsx_runtime_1.jsxs)(api_1.ActionPanel, { children: [chainExplorer ? ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: `https://${chainExplorer.baseUrl}/address/${address.address}`, title: "Open in Explorer", onOpen: () => handleItemAction() })) : ((0, jsx_runtime_1.jsx)(api_1.Action.OpenInBrowser, { url: `https://routescan.io/address/${address.address}?chainId=${address.chainId}`, title: "Open in Routescan", onOpen: () => handleItemAction() })), (0, jsx_runtime_1.jsx)(api_1.Action.CopyToClipboard, { content: address.address, title: "Copy Address", onCopy: () => handleItemAction() }), chainExplorer && selectedExplorer?.chainId !== parseInt(address.chainId, 10) && ((0, jsx_runtime_1.jsx)(api_1.Action, { title: `Switch to ${chainExplorer.chainName}`, icon: api_1.Icon.Switch, onAction: () => {
                                        handleExplorerChange(chainExplorer);
                                        handleItemAction();
                                    } }))] }) }, itemId));
                }) })) : null] }));
}
