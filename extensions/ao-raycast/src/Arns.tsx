import React from "react";
import "cross-fetch/polyfill";
import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  LocalStorage,
  getPreferenceValues,
  Icon,
  Color,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ARIO } from "@ar.io/sdk";
import { UndernamesView } from "./UndernamesView";
import { getRoutableUrl, getBestGateway } from "./utils/ao";

interface PaginatedResponse {
  items: Array<{
    name: string;
    transactionId?: string;
  }>;
  nextCursor?: string;
  hasMore: boolean;
}

interface ArnsRecord {
  name: string;
  transactionId?: string;
  undernames?: Array<{
    name: string;
    transactionId?: string;
  }>;
}

interface Preferences {
  defaultGateway: string;
  useWayfinder: boolean;
}

interface StorageMetadata {
  totalPages: string;
  totalRecords: string;
  lastUpdated: string;
  hasMore: boolean;
}

function isStorageMetadata(value: unknown): value is StorageMetadata {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.totalPages === "string" &&
    typeof v.totalRecords === "string" &&
    typeof v.lastUpdated === "string" &&
    typeof v.hasMore === "boolean"
  );
}

const STORAGE_KEYS = {
  metadata: "arns_records_metadata" as const,
  pagePrefix: "arns_records_page_" as const,
};

function getPageKey(page: number): string {
  const pageStr: string = page.toString();
  return STORAGE_KEYS.pagePrefix + pageStr;
}

export default function Command() {
  const { defaultGateway, useWayfinder } = getPreferenceValues<Preferences>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filteredArns, setFilteredArns] = useState<ArnsRecord[]>([]);
  const [recordCount, setRecordCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [bestGateway, setBestGateway] = useState(defaultGateway);
  const [routedUrls, setRoutedUrls] = useState<Record<string, string>>({});
  const [searchText, setSearchText] = useState("");
  const [gatewayLastChecked, setGatewayLastChecked] = useState<number>(0);
  const RECORDS_PER_PAGE = 50; // Limit records shown at once
  const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds
  const GATEWAY_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes in milliseconds

  async function fetchAllArNSRecords() {
    try {
      // Try to get cached records first
      const cachedRecords = await LocalStorage.getItem<string>("arns_records");
      const cachedTimestamp = await LocalStorage.getItem<string>(
        "arns_records_timestamp",
      );
      const now = Date.now();
      const CACHE_THRESHOLD = 15 * 60 * 1000; // 15 minutes in milliseconds

      // Use cache if it exists
      if (cachedRecords && cachedTimestamp) {
        try {
          const parsedRecords = JSON.parse(cachedRecords);
          if (
            Array.isArray(parsedRecords) &&
            parsedRecords.every((record) => record && record.name)
          ) {
            const timestamp = parseInt(cachedTimestamp);
            setLastUpdateTime(new Date(timestamp));
            setRecordCount(parsedRecords.length);
            setIsLoading(false);

            // If cache is fresh (less than 15 minutes old), don't refresh
            if (now - timestamp < CACHE_THRESHOLD) {
              return;
            }
          } else {
            await LocalStorage.removeItem("arns_records");
            await LocalStorage.removeItem("arns_records_timestamp");
          }
        } catch {
          await LocalStorage.removeItem("arns_records");
          await LocalStorage.removeItem("arns_records_timestamp");
        }
      }

      setIsRefreshing(true);
      const arIO = ARIO.init();
      let allRecords: ArnsRecord[] = [];
      let hasNextPage = true;
      let currentCursor: string | undefined;
      let totalFetched = 0;
      let pageCount = 0;

      while (hasNextPage) {
        pageCount++;
        const response = (await arIO.getArNSRecords({
          limit: 1000,
          sortBy: "name",
          sortOrder: "asc",
          cursor: currentCursor,
        })) as PaginatedResponse;

        if (!response || !response.items) {
          throw new Error("Invalid response format from AR.IO SDK");
        }

        // Ensure we have valid records with names
        const records = response.items
          .filter((record) => record && record.name)
          .map((record) => ({
            name: record.name,
            transactionId: record.transactionId,
          }));

        if (records.length === 0) {
          break;
        }

        // Store metadata about the pages
        const metadata: StorageMetadata = {
          totalPages: String(pageCount),
          totalRecords: String(totalFetched),
          lastUpdated: String(now),
          hasMore: hasNextPage,
        };
        await LocalStorage.setItem(
          STORAGE_KEYS.metadata,
          JSON.stringify(metadata),
        );

        // Store this page of records immediately
        const pageKey = getPageKey(pageCount);
        await LocalStorage.setItem(
          pageKey,
          JSON.stringify(records.sort((a, b) => a.name.localeCompare(b.name))),
        );

        // Add new records and maintain sort order
        allRecords = [...allRecords, ...records].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        totalFetched += records.length;

        // Update cursor and check if there's more data
        currentCursor = response.nextCursor;
        hasNextPage = response.hasMore && currentCursor !== undefined;

        // Update state progressively
        setRecordCount(totalFetched);

        // Keep all records in memory while fetching, maintaining sort order
        setFilteredArns(
          searchText
            ? allRecords
                .filter((record) =>
                  record.name.toLowerCase().includes(searchText.toLowerCase()),
                )
                .sort((a, b) => {
                  const commonA = getSimilarityScore(a.name, searchText);
                  const commonB = getSimilarityScore(b.name, searchText);
                  if (commonB !== commonA) {
                    return commonB - commonA; // Sort by most common characters first
                  }
                  return a.name.localeCompare(b.name); // Fallback to alphabetical
                })
            : allRecords.slice(0, RECORDS_PER_PAGE),
        );
      }

      setLastUpdateTime(new Date(now));
      setIsLoading(false);
      setIsRefreshing(false);

      // Show success toast with total records
      showToast(
        Toast.Style.Success,
        "ArNS Records Updated",
        `Found ${totalFetched} records`,
      );
    } catch {
      // Handle error silently
    }
  }

  // Separate background refresh function
  const refreshInBackground = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchAllArNSRecords();
    } catch {
      // ignore
    }
  };

  // Helper to safely parse JSON with type assertion
  const safeParseJSON = (text: unknown): unknown => {
    if (typeof text !== "string") return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  // Helper to safely store data
  const setStorageItem = async (key: string, value: unknown) => {
    await LocalStorage.setItem(key, JSON.stringify(value));
  };

  // Helper to safely get storage item as string
  const getStorageItemAsString = async (
    key: string,
  ): Promise<string | null> => {
    const value = await LocalStorage.getItem(key);
    return typeof value === "string" ? value : null;
  };

  // Replace or remove the old getCommonCharCount function if desired.
  // Here's a new similarity function that penalizes extra characters:
  function getSimilarityScore(str1: string, str2: string): number {
    let score = 0;
    const minLen = Math.min(str1.length, str2.length);
    for (let i = 0; i < minLen; i++) {
      if (str1[i] === str2[i]) {
        score++;
      } else {
        score--;
      }
    }
    // Extra characters penalize the score but less harshly
    score -= Math.abs(str1.length - str2.length) * 0.5;
    return score;
  }

  // Initial load and background refresh setup
  useEffect(() => {
    const checkAndRefresh = async () => {
      try {
        // First check if we have valid metadata and records
        const metadataStr = await getStorageItemAsString(STORAGE_KEYS.metadata);
        if (metadataStr) {
          const parsed = safeParseJSON(metadataStr);
          if (isStorageMetadata(parsed)) {
            // Load the first page to show something immediately
            const firstPageStr = await getStorageItemAsString(getPageKey(1));
            if (firstPageStr) {
              const firstPageRecords = safeParseJSON(firstPageStr);
              if (Array.isArray(firstPageRecords)) {
                setFilteredArns(firstPageRecords);
                setRecordCount(parseInt(parsed.totalRecords, 10));
                setLastUpdateTime(new Date(parseInt(parsed.lastUpdated, 10)));
                setIsLoading(false);
              }
            }
          }
        }

        // Check if we need to refresh
        const lastRefreshStr =
          await getStorageItemAsString("last_refresh_time");
        const now = Date.now();
        const lastRefresh = lastRefreshStr ? parseInt(lastRefreshStr, 10) : 0;

        if (now - lastRefresh > REFRESH_INTERVAL) {
          await refreshInBackground();
          await setStorageItem("last_refresh_time", now);
        }
      } catch {
        setIsLoading(false);
      }
    };

    // Check on initial load
    checkAndRefresh();

    // Set up background refresh check
    const intervalId = setInterval(checkAndRefresh, 60 * 1000); // Check every minute

    return () => clearInterval(intervalId);
  }, []);

  // Update the effect that searches records to use the new similarity approach
  useEffect(() => {
    const searchRecords = async () => {
      try {
        const metadataStr = await getStorageItemAsString(STORAGE_KEYS.metadata);
        if (!metadataStr) return;

        const parsed = safeParseJSON(metadataStr);
        if (!isStorageMetadata(parsed)) return;

        const totalPagesNum = parseInt(parsed.totalPages, 10);
        let allLoadedRecords: ArnsRecord[] = [];

        // Load and combine all cached pages
        for (let page = 1; page <= totalPagesNum; page++) {
          const pageRecordsStr = await getStorageItemAsString(getPageKey(page));
          if (!pageRecordsStr) continue;

          const parsedRecords = safeParseJSON(pageRecordsStr);
          if (!Array.isArray(parsedRecords)) continue;

          allLoadedRecords = [...allLoadedRecords, ...parsedRecords];
        }

        // Sort all records alphabetically first
        allLoadedRecords.sort((a, b) => a.name.localeCompare(b.name));

        // Filter and then sort by similarity if there's search text
        let displayRecords = allLoadedRecords;
        if (searchText) {
          displayRecords = allLoadedRecords
            .filter((record) =>
              record.name.toLowerCase().includes(searchText.toLowerCase()),
            )
            .sort((a, b) => {
              const similarityA = getSimilarityScore(
                a.name.toLowerCase(),
                searchText.toLowerCase(),
              );
              const similarityB = getSimilarityScore(
                b.name.toLowerCase(),
                searchText.toLowerCase(),
              );
              if (similarityB !== similarityA) {
                return similarityB - similarityA;
              }
              return a.name.localeCompare(b.name);
            });
        }

        setHasNextPage(displayRecords.length > RECORDS_PER_PAGE);
        setFilteredArns(displayRecords.slice(0, RECORDS_PER_PAGE));
        setCurrentPage(1);
      } catch {
        // Handle error silently
      }
    };

    searchRecords();
  }, [searchText]);

  // Load more records when scrolling
  const loadMoreRecords = async () => {
    try {
      setFilteredArns((current) => {
        const nextBatch = current.length + RECORDS_PER_PAGE;
        return current.concat(current.slice(current.length, nextBatch));
      });
      setCurrentPage((prev) => prev + 1);
      setHasNextPage(
        filteredArns.length > (currentPage + 1) * RECORDS_PER_PAGE,
      );
    } catch {
      // Handle error silently
    }
  };

  // Optimize gateway selection effect with better caching
  useEffect(() => {
    async function initializeGateway() {
      try {
        // Check if we have a cached best gateway
        const cachedGateway =
          await LocalStorage.getItem<string>("best_gateway");
        const lastChecked = await LocalStorage.getItem<string>(
          "gateway_last_checked",
        );
        const now = Date.now();

        if (cachedGateway && lastChecked) {
          const lastCheckedTime = parseInt(lastChecked, 10);
          if (now - lastCheckedTime < GATEWAY_CHECK_INTERVAL) {
            setBestGateway(cachedGateway);
            setGatewayLastChecked(lastCheckedTime);
            return;
          }
        }

        // Only proceed with ping test if cache is invalid or expired
        const arIO = ARIO.init();
        const gatewaysResult = await arIO.getGateways();

        if (!gatewaysResult?.items?.length) {
          return;
        }

        // Take top 10 gateways
        const topGateways = gatewaysResult.items.slice(0, 10);

        const pingResults = await Promise.all(
          topGateways.map(async (gateway) => {
            const fqdn = gateway.settings.fqdn;
            const start = performance.now();
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            try {
              const response = await fetch(`https://${fqdn}`, {
                method: "HEAD",
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              return {
                fqdn,
                responseTime: performance.now() - start,
                healthy: response.ok,
              };
            } catch {
              clearTimeout(timeoutId);
              return { fqdn, responseTime: Infinity, healthy: false };
            }
          }),
        );

        // Sort by response time and find the best healthy gateway
        const bestResult = pingResults
          .filter((result) => result.healthy)
          .sort((a, b) => a.responseTime - b.responseTime)[0];

        if (bestResult) {
          setBestGateway(bestResult.fqdn);
          setGatewayLastChecked(now);
          await LocalStorage.setItem("best_gateway", bestResult.fqdn);
          await LocalStorage.setItem("gateway_last_checked", now.toString());
        }
      } catch {
        // If there's an error, use the default gateway
        setBestGateway(defaultGateway);
      }
    }

    initializeGateway();
  }, [defaultGateway]); // Only run once on mount

  // Optimize routable URLs effect with batching and caching
  useEffect(() => {
    const routedUrlsCache: Record<string, string> = {};
    let isMounted = true;

    async function getRoutableUrls() {
      if (!useWayfinder || filteredArns.length === 0) return;

      try {
        // Use the cached best gateway if available and not expired
        const now = Date.now();
        let gateway = bestGateway;

        if (now - gatewayLastChecked > GATEWAY_CHECK_INTERVAL) {
          gateway = await getBestGateway(filteredArns[0].name);
        }

        // Process URLs in batches to avoid overwhelming the network
        const batchSize = 10;
        for (let i = 0; i < filteredArns.length; i += batchSize) {
          if (!isMounted) break;

          const batch = filteredArns.slice(i, i + batchSize);
          const batchPromises = batch.map(async (record) => {
            if (!/^[a-zA-Z0-9-_]{43}$/i.test(record.name)) {
              routedUrlsCache[record.name] = await getRoutableUrl(
                record.name,
                gateway,
              );
            }
          });

          await Promise.all(batchPromises);
          if (isMounted) {
            setRoutedUrls({ ...routedUrlsCache });
          }
        }
      } catch {
        // If there's an error, fall back to default URLs
        const fallbackUrls: Record<string, string> = {};
        filteredArns.forEach((record) => {
          if (!/^[a-zA-Z0-9-_]{43}$/i.test(record.name)) {
            fallbackUrls[record.name] = `https://${record.name}.arweave.net`;
          }
        });
        if (isMounted) {
          setRoutedUrls(fallbackUrls);
        }
      }
    }

    getRoutableUrls();

    return () => {
      isMounted = false;
    };
  }, [filteredArns, useWayfinder, bestGateway, gatewayLastChecked]);

  const getArnsUrl = (name: string) => {
    // Handle transaction IDs
    if (/^[a-zA-Z0-9-_]{43}$/i.test(name)) {
      const cleanGateway = defaultGateway
        .replace(/^https?:\/\//, "")
        .replace(/\/$/, "");
      return `https://${cleanGateway}/${name}`;
    }

    if (useWayfinder) {
      return routedUrls[name] || `https://${name}.arweave.net`;
    }

    // Handle ArNS domains
    const cleanGateway = defaultGateway
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");
    return `https://${name}.${cleanGateway}`;
  };

  const getViewBlockUrl = (txId: string) => {
    return `https://viewblock.io/arweave/tx/${txId}`;
  };

  const getAoLinkUrl = (txId: string) => {
    return `https://www.ao.link/#/message/${txId}`;
  };

  const getLastUpdateText = () => {
    if (!lastUpdateTime) return "Never updated";
    const minutes = Math.floor((Date.now() - lastUpdateTime.getTime()) / 60000);
    if (minutes < 1) return "Updated just now";
    if (minutes === 1) return "Updated 1 minute ago";
    return `Updated ${minutes} minutes ago`;
  };

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search ArNS records..."
      navigationTitle={`ArNS Records (${recordCount})`}
      onSelectionChange={(id) => {
        if (
          id &&
          hasNextPage &&
          filteredArns.length - filteredArns.findIndex((r) => r.name === id) <
            10
        ) {
          loadMoreRecords();
        }
      }}
      searchBarAccessory={
        <List.Dropdown
          tooltip={isRefreshing ? "Refreshing..." : getLastUpdateText()}
          storeValue={false}
          onChange={() => {}}
        >
          <List.Dropdown.Item
            title={getLastUpdateText()}
            value="status"
            icon={
              isRefreshing
                ? { source: Icon.Circle, tintColor: Color.Yellow }
                : lastUpdateTime &&
                    Date.now() - lastUpdateTime.getTime() < 15 * 60 * 1000
                  ? { source: Icon.Circle, tintColor: Color.Green }
                  : { source: Icon.Circle, tintColor: Color.Red }
            }
          />
        </List.Dropdown>
      }
    >
      {!isLoading && filteredArns.length === 0 ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={searchText ? "No Matching Records" : "No ArNS Records"}
          description={
            searchText
              ? "Try a different search term"
              : "Unable to fetch ArNS records. Please try again later."
          }
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={fetchAllArNSRecords}
              />
            </ActionPanel>
          }
        />
      ) : (
        filteredArns.map((record) => (
          <List.Item
            key={record.name}
            title={record.name}
            subtitle={
              useWayfinder
                ? `${record.name} (Wayfinder)`
                : `${record.name}.${defaultGateway.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
            }
            accessories={[
              {
                icon: record.transactionId ? Icon.Link : undefined,
                tooltip: record.transactionId ? "Has transaction" : undefined,
              },
            ]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.Push
                    title="Show Details"
                    icon={Icon.Sidebar}
                    target={
                      <UndernamesView
                        record={record}
                        defaultGateway={defaultGateway}
                        useWayfinder={useWayfinder}
                      />
                    }
                    shortcut={{ modifiers: [], key: "return" }}
                  />
                  <Action.OpenInBrowser
                    title={
                      useWayfinder ? "Open with Wayfinder" : "Open in Browser"
                    }
                    url={getArnsUrl(record.name)}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                </ActionPanel.Section>
                {record.transactionId && (
                  <ActionPanel.Section title="Transaction">
                    <Action.OpenInBrowser
                      title="View in ao.link"
                      icon={Icon.Link}
                      shortcut={{ modifiers: ["cmd"], key: "o" }}
                      url={getAoLinkUrl(record.transactionId)}
                    />
                    <Action.OpenInBrowser
                      title="View in ViewBlock"
                      icon={Icon.MagnifyingGlass}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                      url={getViewBlockUrl(record.transactionId)}
                    />
                  </ActionPanel.Section>
                )}
                <ActionPanel.Section>
                  <Action.CopyToClipboard
                    title="Copy ArNS Name"
                    content={record.name}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title={
                      useWayfinder ? "Copy Wayfinder URL" : "Copy Full URL"
                    }
                    content={getArnsUrl(record.name)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                  {record.transactionId && (
                    <Action.CopyToClipboard
                      title="Copy Transaction ID"
                      content={record.transactionId}
                      shortcut={{ modifiers: ["cmd", "opt"], key: "c" }}
                    />
                  )}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
