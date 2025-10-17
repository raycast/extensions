import {
  ActionPanel,
  Action,
  List,
  LocalStorage,
  Icon,
  showToast,
  Clipboard,
  useNavigation,
  getSelectedText,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { Explorer, ExplorerConfig } from "./interfaces";
import { TransactionMatch, AddressMatch, ENSMatch, BlockMatch, SignatureMatch, Match } from "./matchers";
import * as chains from "viem/chains";
import { Chain } from "viem/chains";
import { customChains } from "./custom-chains";
import { getAddressVariations, shortenAddress } from "./utils/blockchain-utils";
import { AddressDetail } from "./components/address-detail";
import {
  SavedAddress,
  SearchHistoryItem,
  isAddressSaved,
  addToHistory,
  getSearchHistory,
  deleteHistoryItem,
  clearSearchHistory,
} from "./utils/storage";
import SaveAddressForm from "./components/save-address-form";

interface RoutescanTransactionItem {
  chainId: string;
  hash: string;
  blockchainId: string;
}

interface RoutescanToken {
  chainId: string;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  marketCap?: string;
  market?: {
    price?: number;
    priceChange24h?: number;
    priceChange1h?: number;
    marketCap?: number;
    circulatingSupply?: number;
    totalSupply?: number;
  };
  detail?: {
    alias?: string;
    description?: string;
    icon?: string;
    iconUrls?: Record<string, string>;
    reputation?: string;
    tags?: string[];
    social_profile?: Record<string, string | null> & {
      items?: Array<{
        type: string;
        value: string;
        id: string;
      }>;
    };
  };
}

interface RoutescanAddress {
  chainId: string;
  address: string;
  type?: string;
  name?: string;
  balance?: string;
  balanceValueUsd?: string;
  transactions?: {
    total: number;
  };
  detail?: {
    blacklist?: boolean;
    isContract?: boolean;
  };
  data?: Record<string, unknown>;
}

interface RoutescanResponse {
  type: string;
  evmTransactions?: {
    items: RoutescanTransactionItem[];
    meta?: { count: { lowerBound: number } };
  };
  erc20?: {
    items: RoutescanToken[];
    meta: { count: { lowerBound: number } };
  };
  erc721?: {
    items: RoutescanToken[];
    meta: { count: { lowerBound: number } };
  };
  erc1155?: {
    items: RoutescanToken[];
    meta: { count: { lowerBound: number } };
  };
  addresses?: {
    items: RoutescanAddress[];
    meta: { count: { lowerBound: number } };
  };
}

const createExplorersFromChains = (): Explorer[] => {
  const allChains = [...Object.values(chains), ...customChains];

  // Deduplicate by chainId, keeping the first occurrence
  const uniqueChains = Array.from(new Map(allChains.map((chain) => [chain.id, chain])).values());

  return uniqueChains
    .filter((chain: Chain) => chain.blockExplorers?.default !== undefined)
    .map((chain: Chain) => {
      if (!chain.blockExplorers?.default) {
        throw new Error("Chain should have default explorer");
      }

      const explorer: Explorer = {
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
async function getAllExplorers(): Promise<Explorer[]> {
  const builtInExplorers = createExplorersFromChains();

  try {
    const userChainsJson = await LocalStorage.getItem<string>("user-custom-chains");
    const userChains: Explorer[] = userChainsJson ? JSON.parse(userChainsJson) : [];
    return [...builtInExplorers, ...userChains];
  } catch (error) {
    console.error("Error loading user chains:", error);
    return builtInExplorers;
  }
}

const explorers = createExplorersFromChains();
const defaultExplorer = explorers.find((explorer: Explorer) => explorer.chainId === 1) || explorers[0];

// Simple in-memory cache for Routescan API responses
const routescanCache = new Map<string, { data: RoutescanResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Function to check the Routescan API
async function checkRoutescan(query: string): Promise<RoutescanResponse | null> {
  // Don't make requests for invalid or overly long queries
  // Minimum 3 characters for API calls
  const minApiQueryLength = 3;
  const maxQueryLength = 200; // Allow up to 200 characters for flexibility
  if (!query || query.length < minApiQueryLength || query.length > maxQueryLength) return null;

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

    const data = await response.json();
    const totalTime = Date.now() - startTime;

    console.log(
      `[Routescan] Success in ${totalTime}ms - tokens: ${data.erc20?.items?.length || 0}, addresses: ${data.addresses?.items?.length || 0}`,
    );

    // Cache the successful response
    routescanCache.set(query.toLowerCase(), { data, timestamp: Date.now() });

    return data as RoutescanResponse;
  } catch (err) {
    const totalTime = Date.now() - startTime;
    console.error(`[Routescan] Error after ${totalTime}ms:`, err);
    // Silently fail - Routescan is an optional enhancement feature
    // The extension will continue to work with manual chain selection
    return null;
  }
}

// Function to find the explorer by chain ID
function findExplorerByChainId(chainId: string | number): Explorer | undefined {
  const numericChainId = typeof chainId === "string" ? parseInt(chainId, 10) : chainId;
  return explorers.find((e) => e.chainId === numericChainId);
}

// Get relative time string
function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export default function Command() {
  const [selectedExplorer, setSelectedExplorer] = useState<Explorer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);
  const [textSource, setTextSource] = useState<"manual" | "selected" | "clipboard">("manual");
  const [matches, setMatches] = useState<Match[]>([]);
  const [routescanResults, setRoutescanResults] = useState<RoutescanResponse | null>(null);
  const [routescanLoading, setRoutescanLoading] = useState(false);
  const [allExplorers, setAllExplorers] = useState<Explorer[]>(explorers);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [savedAddressesMap, setSavedAddressesMap] = useState<Map<string, SavedAddress>>(new Map());
  const { push } = useNavigation();

  useEffect(() => {
    const loadExplorer = async () => {
      try {
        setIsLoading(true);

        // Load all explorers (built-in + user-added)
        const loadedExplorers = await getAllExplorers();
        setAllExplorers(loadedExplorers);

        // Load custom configs
        const customConfigsJson = await LocalStorage.getItem<string>("custom-explorer-configs");
        const customConfigs: Record<number, ExplorerConfig> = customConfigsJson ? JSON.parse(customConfigsJson) : {};

        const explorerFromStorage = await LocalStorage.getItem<string>("selected-explorer");
        if (explorerFromStorage) {
          try {
            const parsedExplorer: Explorer = JSON.parse(explorerFromStorage);
            // Apply custom config if available
            if (customConfigs[parsedExplorer.chainId]) {
              parsedExplorer.config = customConfigs[parsedExplorer.chainId];
            }
            setSelectedExplorer(parsedExplorer);
          } catch (error) {
            console.error("Error parsing explorer:", error);
            setSelectedExplorer(defaultExplorer);
            showToast({ title: "Error", message: "Failed to load selected explorer" });
          }
        } else {
          setSelectedExplorer(defaultExplorer);
        }

        // Load search history
        const history = await getSearchHistory();
        setSearchHistory(history);

        // Load saved addresses into map for quick lookup
        const { getSavedAddresses } = await import("./utils/storage");
        const savedAddresses = await getSavedAddresses();
        const addressMap = new Map<string, SavedAddress>();
        savedAddresses.forEach((addr) => {
          addressMap.set(addr.address.toLowerCase(), addr);
        });
        setSavedAddressesMap(addressMap);
      } catch (error) {
        console.error("Error loading explorer:", error);
        setSelectedExplorer(defaultExplorer);
      } finally {
        setIsLoading(false);
      }
    };

    loadExplorer();
  }, []);

  useEffect(() => {
    if (!selectedExplorer || !searchText) {
      setMatches([]);
      return;
    }

    // Allow searching with any text length - let matchers decide if they match
    // This enables short searches like "ggp", "eth", block numbers, etc.
    const possibleMatches: Match[] = [
      new SignatureMatch(searchText, selectedExplorer),
      new TransactionMatch(searchText, selectedExplorer),
      new AddressMatch(searchText, selectedExplorer),
      new ENSMatch(searchText, selectedExplorer),
      new BlockMatch(searchText, selectedExplorer),
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
  useEffect(() => {
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
      if (isMounted) setRoutescanLoading(true);

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
            showToast({
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
  const looksLikeBlockchainData = (text: string): boolean => {
    if (!text || text.length < 10) return false;

    // Remove whitespace and newlines
    const cleaned = text.trim().replace(/\s+/g, "");

    // Too long - probably not blockchain data
    if (cleaned.length > 200) return false;

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
  useEffect(() => {
    if (hasInitialized) return;

    let mounted = true;

    const loadInitialText = async () => {
      try {
        // Try to get selected text first
        const selectedText = await getSelectedText();
        if (mounted && selectedText && selectedText.length > 0) {
          // Only auto-populate if it looks like blockchain data
          if (looksLikeBlockchainData(selectedText)) {
            setSearchText(selectedText.trim());
            setTextSource("selected");
            showToast({
              title: "Selected Text Detected",
              message: "Populated from highlighted text",
            });
            setHasInitialized(true);
            return;
          }
        }
      } catch {
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
  const handleItemAction = (..._args: unknown[]) => {
    // Intentionally empty - kept for backwards compatibility
  };

  // Track search in history
  const trackSearch = async (query: string, type: SearchHistoryItem["type"], url: string) => {
    if (!selectedExplorer) return;

    const historyItem: SearchHistoryItem = {
      id: `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      query,
      type,
      chainId: selectedExplorer.chainId,
      chainName: selectedExplorer.chainName,
      timestamp: Date.now(),
      url,
    };

    await addToHistory(historyItem);
    const updatedHistory = await getSearchHistory();
    setSearchHistory(updatedHistory);
  };

  const handleExplorerChange = async (explorer: Explorer) => {
    try {
      // Load custom config if available
      const customConfigsJson = await LocalStorage.getItem<string>("custom-explorer-configs");
      const customConfigs: Record<number, ExplorerConfig> = customConfigsJson ? JSON.parse(customConfigsJson) : {};

      const explorerWithConfig = { ...explorer };
      if (customConfigs[explorer.chainId]) {
        explorerWithConfig.config = customConfigs[explorer.chainId];
      }

      await LocalStorage.setItem("selected-explorer", JSON.stringify(explorerWithConfig));
      setSelectedExplorer(explorerWithConfig);
      showToast({ title: "Explorer changed", message: `${explorer.chainName}` });
    } catch (error) {
      console.error("Error saving explorer:", error);
      showToast({ title: "Error", message: "Failed to save explorer selection" });
    }
  };

  // Function to render the detail markdown for the token
  const getTokenDetailMarkdown = (token: RoutescanToken): string => {
    let markdown = `# ${token.name} (${token.symbol})\n\n`;

    // Add icon if available
    if (token.detail?.iconUrls?.["256"]) {
      markdown += `![Token Icon](${token.detail.iconUrls["256"]})\n\n`;
    } else if (token.detail?.icon) {
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

  const handleSelectionChange = (id: string | null) => {
    // Note: Removed auto-population of searchText when selecting items.
    // This was causing the search bar to revert when users were trying to type.
    // Users can still click on items to open them without changing their search query.
    if (!id) return;
  };

  if (isLoading) {
    return <List isLoading />;
  }

  return (
    <List
      isLoading={isLoading || routescanLoading}
      searchText={searchText || ""}
      onSearchTextChange={(text) => {
        setSearchText(text || "");
        // Reset source to manual when user types
        if (textSource !== "manual") {
          setTextSource("manual");
        }
      }}
      searchBarPlaceholder={`Search by Address / Transaction Hash / Block / ENS name`}
      throttle={true}
      onSelectionChange={handleSelectionChange}
      navigationTitle="Blockchain Explorer Search"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Explorer"
          value={selectedExplorer ? selectedExplorer.chainId.toString() : ""}
          onChange={(newValue) => {
            const explorer = allExplorers.find((e) => e.chainId.toString() === newValue);
            if (explorer) {
              handleExplorerChange(explorer);
            }
          }}
        >
          <List.Dropdown.Section title="Mainnets">
            {allExplorers
              .filter((explorer) => !explorer.testNet)
              .sort((a, b) => a.chainName.localeCompare(b.chainName))
              .map((explorer) => (
                <List.Dropdown.Item
                  key={explorer.chainId}
                  title={explorer.chainName}
                  value={explorer.chainId.toString()}
                  icon={{ source: explorer.iconUri }}
                />
              ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Testnets">
            {allExplorers
              .filter((explorer) => explorer.testNet)
              .sort((a, b) => a.chainName.localeCompare(b.chainName))
              .map((explorer) => (
                <List.Dropdown.Item
                  key={explorer.chainId}
                  title={explorer.chainName}
                  value={explorer.chainId.toString()}
                  icon={{ source: explorer.iconUri }}
                />
              ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {/* Recent Searches Section - show when search is empty or at the bottom */}
      {searchHistory.length > 0 && !searchText && (
        <List.Section title="Recent Searches" subtitle={`Last ${Math.min(searchHistory.length, 10)} searches`}>
          {searchHistory.slice(0, 10).map((item) => {
            const relativeTime = getRelativeTime(item.timestamp);
            return (
              <List.Item
                key={item.id}
                title={shortenAddress(item.query)}
                subtitle={`${item.type} • ${item.chainName}`}
                icon={Icon.Clock}
                accessories={[{ text: relativeTime }]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Actions">
                      <Action
                        title="Search Again"
                        icon={Icon.MagnifyingGlass}
                        onAction={() => setSearchText(item.query)}
                      />
                      {item.url && (
                        <Action.OpenInBrowser
                          url={item.url}
                          title="Open in Explorer"
                          onOpen={() => trackSearch(item.query, item.type, item.url!)}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Manage">
                      <Action
                        title="Delete from History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={async () => {
                          await deleteHistoryItem(item.id);
                          const updatedHistory = await getSearchHistory();
                          setSearchHistory(updatedHistory);
                          showToast({ title: "Deleted", message: "Removed from history" });
                        }}
                      />
                      <Action
                        title="Clear All History"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                        onAction={async () => {
                          await clearSearchHistory();
                          setSearchHistory([]);
                          showToast({ title: "Cleared", message: "All history cleared" });
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard content={item.query} title="Copy Query" />
                      {item.url && <Action.CopyToClipboard content={item.url} title="Copy URL" />}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {routescanResults?.evmTransactions?.items.length ? (
        <List.Section title="Detected Transactions" subtitle="From Routescan">
          {routescanResults.evmTransactions.items.map((tx, index) => {
            const chainExplorer = findExplorerByChainId(tx.chainId);
            const itemId = `tx-${index}`;
            return (
              <List.Item
                id={itemId}
                key={itemId}
                title={`Transaction: ${tx.hash.slice(0, 14)}...${tx.hash.slice(-8)}`}
                subtitle={chainExplorer?.chainName || `Chain ID ${tx.chainId}`}
                icon={chainExplorer?.iconUri || { source: Icon.Link }}
                accessories={[
                  { text: "Transaction", icon: Icon.Document },
                  { text: chainExplorer?.chainName || `Chain ID ${tx.chainId}`, icon: Icon.Link },
                ]}
                actions={
                  <ActionPanel>
                    {chainExplorer ? (
                      <Action.OpenInBrowser
                        url={`https://${chainExplorer.baseUrl}/tx/${tx.hash}`}
                        title="Open in Explorer"
                        onOpen={() => handleItemAction(tx.hash)}
                      />
                    ) : (
                      <Action.OpenInBrowser
                        url={`https://routescan.io/transaction/${tx.hash}?chainId=${tx.chainId}`}
                        title="Open in Routescan"
                        onOpen={() => handleItemAction(tx.hash)}
                      />
                    )}
                    <Action.CopyToClipboard
                      content={tx.hash}
                      title="Copy Hash"
                      onCopy={() => handleItemAction(tx.hash)}
                    />
                    {chainExplorer && selectedExplorer?.chainId !== parseInt(tx.chainId, 10) && (
                      <Action
                        title={`Switch to ${chainExplorer.chainName}`}
                        icon={Icon.Switch}
                        onAction={() => {
                          handleExplorerChange(chainExplorer);
                          handleItemAction(tx.hash);
                        }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}

      {routescanResults?.erc20?.items.length ? (
        <List.Section title="Detected Tokens" subtitle="From Routescan">
          {routescanResults.erc20.items.map((token, index) => {
            const chainExplorer = findExplorerByChainId(token.chainId);
            const itemId = `token-${index}`;
            return (
              <List.Item
                id={itemId}
                key={itemId}
                title={`${token.name} (${token.symbol})`}
                subtitle={chainExplorer?.chainName || `Chain ID ${token.chainId}`}
                icon={token.detail?.iconUrls?.["64"] || chainExplorer?.iconUri || { source: Icon.Coin }}
                accessories={[
                  ...(token.market?.price
                    ? [
                        {
                          text: `$${token.market.price.toFixed(token.market.price < 1 ? 4 : 2)}`,
                          icon: Icon.Coin,
                        },
                      ]
                    : [{ text: "Token", icon: Icon.Coin }]),
                  ...(token.market?.priceChange24h
                    ? [
                        {
                          text: `${token.market.priceChange24h > 0 ? "+" : ""}${token.market.priceChange24h.toFixed(2)}%`,
                          icon: token.market.priceChange24h > 0 ? Icon.ChevronUp : Icon.ChevronDown,
                        },
                      ]
                    : []),
                  { text: token.symbol, icon: Icon.Tag },
                ]}
                detail={
                  <List.Item.Detail
                    markdown={getTokenDetailMarkdown(token)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Label title="Name" text={token.name} />
                        <List.Item.Detail.Metadata.Label title="Symbol" text={token.symbol} />
                        <List.Item.Detail.Metadata.Label
                          title="Chain"
                          text={chainExplorer?.chainName || `Chain ID ${token.chainId}`}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Decimals"
                          text={token.decimals !== undefined ? token.decimals.toString() : ""}
                        />
                        {token.market?.price && (
                          <>
                            <List.Item.Detail.Metadata.Separator />
                            <List.Item.Detail.Metadata.Label
                              title="Price"
                              text={`$${token.market.price.toFixed(token.market.price < 1 ? 4 : 2)}`}
                            />
                            {token.market.priceChange24h !== undefined && (
                              <List.Item.Detail.Metadata.Label
                                title="24h Change"
                                text={`${token.market.priceChange24h > 0 ? "+" : ""}${token.market.priceChange24h.toFixed(2)}%`}
                                icon={token.market.priceChange24h > 0 ? Icon.ChevronUp : Icon.ChevronDown}
                              />
                            )}
                          </>
                        )}
                        {token.marketCap && (
                          <List.Item.Detail.Metadata.Label
                            title="Market Cap"
                            text={`$${Number(token.marketCap).toLocaleString()}`}
                          />
                        )}
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Contract Address" text={token.address} />
                        {token.detail?.tags && (
                          <List.Item.Detail.Metadata.TagList title="Tags">
                            {token.detail.tags.map((tag, idx) => (
                              <List.Item.Detail.Metadata.TagList.Item key={idx} text={tag} />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    {chainExplorer ? (
                      <Action.OpenInBrowser
                        url={`https://${chainExplorer.baseUrl}/token/${token.address}`}
                        title="Open in Explorer"
                        onOpen={() => handleItemAction(token.address)}
                      />
                    ) : (
                      <Action.OpenInBrowser
                        url={`https://routescan.io/token/${token.address}?chainId=${token.chainId}`}
                        title="Open in Routescan"
                        onOpen={() => handleItemAction(token.address)}
                      />
                    )}
                    <Action.CopyToClipboard
                      content={token.address}
                      title="Copy Address"
                      onCopy={() => handleItemAction(token.address)}
                    />
                    <Action
                      title={savedAddressesMap.has(token.address.toLowerCase()) ? "Edit Saved Token" : "Save Token"}
                      icon={savedAddressesMap.has(token.address.toLowerCase()) ? Icon.Pencil : Icon.Star}
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={async () => {
                        const existing = await isAddressSaved(token.address);
                        const tokenChainId = parseInt(token.chainId, 10);
                        push(
                          <SaveAddressForm
                            address={token.address}
                            chainId={tokenChainId}
                            chainName={chainExplorer?.chainName || `Chain ${tokenChainId}`}
                            allExplorers={allExplorers}
                            existingEntry={existing || undefined}
                            onSaved={async () => {
                              // Reload saved addresses
                              const { getSavedAddresses } = await import("./utils/storage");
                              const savedAddresses = await getSavedAddresses();
                              const addressMap = new Map<string, SavedAddress>();
                              savedAddresses.forEach((addr) => {
                                addressMap.set(addr.address.toLowerCase(), addr);
                              });
                              setSavedAddressesMap(addressMap);
                              showToast({ title: "Saved", message: `${token.name} saved` });
                            }}
                          />,
                        );
                      }}
                    />
                    {chainExplorer && selectedExplorer?.chainId !== parseInt(token.chainId, 10) && (
                      <Action
                        title={`Switch to ${chainExplorer.chainName}`}
                        icon={Icon.Switch}
                        onAction={() => {
                          handleExplorerChange(chainExplorer);
                          handleItemAction(token.address);
                        }}
                      />
                    )}
                    {token.detail?.social_profile?.items?.map((link, idx) => {
                      if (
                        link.type &&
                        link.value &&
                        (link.type === "url" ||
                          link.type === "website" ||
                          link.type === "twitter" ||
                          link.type === "github" ||
                          link.type === "coingecko")
                      ) {
                        return (
                          <Action.OpenInBrowser
                            key={idx}
                            url={link.value}
                            title={`Open ${link.type.charAt(0).toUpperCase() + link.type.slice(1)}`}
                            onOpen={() => handleItemAction(token.address)}
                          />
                        );
                      }
                      return null;
                    })}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
      {/* Regular Search Results Section */}
      {matches.length > 0 ? (
        <List.Section title="Selected Chain" subtitle={selectedExplorer?.chainName}>
          {matches.map((match, index) => {
            const itemId = `match-${index}`;
            return (
              <List.Item
                id={itemId}
                key={itemId}
                title={match.title}
                icon={selectedExplorer?.iconUri}
                subtitle={
                  match instanceof SignatureMatch
                    ? "Signature"
                    : match instanceof TransactionMatch
                      ? "Transaction"
                      : match instanceof AddressMatch
                        ? "Address"
                        : match instanceof ENSMatch
                          ? "ENS"
                          : "Block"
                }
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Primary Actions">
                      <Action.OpenInBrowser
                        url={match.path}
                        title="Open in Explorer"
                        onOpen={() => {
                          handleItemAction(match.parsedSearch);
                          trackSearch(match.parsedSearch, match.matchType, match.path);
                        }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Copy Actions">
                      <Action.CopyToClipboard
                        content={match.parsedSearch}
                        title="Copy Value"
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                        onCopy={() => showToast({ title: "Copied", message: "Copied to clipboard" })}
                      />
                      <Action.CopyToClipboard
                        content={match.path}
                        title="Copy Explorer URL"
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                        onCopy={() => showToast({ title: "Copied URL", message: "Explorer URL copied" })}
                      />

                      {match instanceof AddressMatch &&
                        (() => {
                          const variations = getAddressVariations(match.parsedSearch);
                          return (
                            <>
                              {variations.checksummed && variations.checksummed !== match.parsedSearch && (
                                <Action.CopyToClipboard
                                  content={variations.checksummed}
                                  title="Copy Checksummed Address"
                                  icon={Icon.Check}
                                  onCopy={() => showToast({ title: "Copied", message: "Checksummed address copied" })}
                                />
                              )}
                              {variations.withoutPrefix && (
                                <Action.CopyToClipboard
                                  content={variations.withoutPrefix}
                                  title="Copy Without 0X Prefix"
                                  icon={Icon.Minus}
                                  onCopy={() =>
                                    showToast({ title: "Copied", message: "Address without prefix copied" })
                                  }
                                />
                              )}
                              <Action.CopyToClipboard
                                content={variations.lowercase}
                                title="Copy Lowercase"
                                icon={Icon.Text}
                                onCopy={() => showToast({ title: "Copied", message: "Lowercase address copied" })}
                              />
                            </>
                          );
                        })()}
                    </ActionPanel.Section>

                    {match instanceof AddressMatch && selectedExplorer && (
                      <ActionPanel.Section title="Address Tools">
                        <Action
                          title="View Address Details"
                          icon={Icon.Info}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() =>
                            push(<AddressDetail address={match.parsedSearch} explorer={selectedExplorer} />)
                          }
                        />
                        <Action
                          title={
                            savedAddressesMap.has(match.parsedSearch.toLowerCase())
                              ? "Edit Saved Address"
                              : "Save Address"
                          }
                          icon={savedAddressesMap.has(match.parsedSearch.toLowerCase()) ? Icon.Pencil : Icon.Star}
                          shortcut={{ modifiers: ["cmd"], key: "s" }}
                          onAction={async () => {
                            const existing = await isAddressSaved(match.parsedSearch);
                            push(
                              <SaveAddressForm
                                address={match.parsedSearch}
                                chainId={selectedExplorer.chainId}
                                chainName={selectedExplorer.chainName}
                                allExplorers={allExplorers}
                                existingEntry={existing || undefined}
                                onSaved={async () => {
                                  // Reload saved addresses
                                  const { getSavedAddresses } = await import("./utils/storage");
                                  const savedAddresses = await getSavedAddresses();
                                  const addressMap = new Map<string, SavedAddress>();
                                  savedAddresses.forEach((addr) => {
                                    addressMap.set(addr.address.toLowerCase(), addr);
                                  });
                                  setSavedAddressesMap(addressMap);
                                }}
                              />,
                            );
                          }}
                        />
                        <Action
                          title="Copy Qr Code to Clipboard"
                          icon={Icon.Code}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "q" }}
                          onAction={() => {
                            Clipboard.copy(match.parsedSearch);
                            showToast({
                              title: "Address Copied",
                              message: "Use Cmd+D to view QR code",
                            });
                          }}
                        />
                        <Action.CopyToClipboard
                          content={`ethereum:${match.parsedSearch}`}
                          title="Copy as Payment Uri"
                          icon={Icon.Link}
                          onCopy={() => showToast({ title: "Copied", message: "Payment URI copied" })}
                        />
                      </ActionPanel.Section>
                    )}

                    <ActionPanel.Section title="Sharing">
                      <Action.CopyToClipboard
                        content={`${selectedExplorer?.chainName}: ${shortenAddress(match.parsedSearch)}\n${match.path}`}
                        title="Copy Formatted for Sharing"
                        icon={Icon.Document}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                        onCopy={() => showToast({ title: "Copied", message: "Formatted details copied" })}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : searchText ? (
        <List.EmptyView
          title={routescanLoading ? "Searching..." : "No Matches Found"}
          description={
            routescanLoading
              ? "Checking blockchain data..."
              : "Please enter a valid address, transaction hash, block number, or ENS name"
          }
          icon={routescanLoading ? Icon.Clock : Icon.MagnifyingGlass}
        />
      ) : (
        <List.EmptyView
          title={selectedExplorer ? "Enter Search Query" : "Select an Explorer First"}
          description={
            selectedExplorer
              ? "Enter an address, transaction hash, block number, or ENS name"
              : "Use the dropdown above to select a blockchain explorer"
          }
          icon={Icon.MagnifyingGlass}
        />
      )}

      {routescanResults?.addresses?.items.length ? (
        <List.Section title="Detected Addresses" subtitle="From Routescan">
          {routescanResults.addresses.items.map((address, index) => {
            const chainExplorer = findExplorerByChainId(address.chainId);
            const itemId = `address-${index}`;
            return (
              <List.Item
                id={itemId}
                key={itemId}
                title={address.name || `Address: ${address.address.slice(0, 10)}...${address.address.slice(-8)}`}
                subtitle={chainExplorer?.chainName || `Chain ID ${address.chainId}`}
                icon={chainExplorer?.iconUri || { source: Icon.Person }}
                accessories={[
                  { text: address.type || "Address", icon: Icon.Person },
                  { text: chainExplorer?.chainName || `Chain ID ${address.chainId}`, icon: Icon.Link },
                ]}
                actions={
                  <ActionPanel>
                    {chainExplorer ? (
                      <Action.OpenInBrowser
                        url={`https://${chainExplorer.baseUrl}/address/${address.address}`}
                        title="Open in Explorer"
                        onOpen={() => handleItemAction(address.address)}
                      />
                    ) : (
                      <Action.OpenInBrowser
                        url={`https://routescan.io/address/${address.address}?chainId=${address.chainId}`}
                        title="Open in Routescan"
                        onOpen={() => handleItemAction(address.address)}
                      />
                    )}
                    <Action.CopyToClipboard
                      content={address.address}
                      title="Copy Address"
                      onCopy={() => handleItemAction(address.address)}
                    />
                    {chainExplorer && selectedExplorer?.chainId !== parseInt(address.chainId, 10) && (
                      <Action
                        title={`Switch to ${chainExplorer.chainName}`}
                        icon={Icon.Switch}
                        onAction={() => {
                          handleExplorerChange(chainExplorer);
                          handleItemAction(address.address);
                        }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ) : null}
    </List>
  );
}
