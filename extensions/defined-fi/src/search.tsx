// Search Tokens command: search tokens by name/symbol/address across Codex,
// preview them in a detail pane, and open the highlighted result on defined.fi.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  closeMainWindow,
  Color,
  Icon,
  Keyboard,
  List,
  open,
  openExtensionPreferences,
  PopToRootType,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { getNetworks, searchTokens } from "./lib/codex";
import { getApiKey } from "./lib/key";
import { Onboarding } from "./components/Onboarding";
import { CodexError } from "./lib/types";
import type { Network, TokenResult } from "./lib/types";
import { addRecent, clearRecents, getRecents } from "./lib/recents";
import { formatPercent, formatUsd, isFlatChange, tokenHeaderMarkdown, tokenLabels } from "./lib/format";

const SEARCH_DEBOUNCE_MS = 300;

type EmptyState = "none" | "no-results" | "quota" | "error";

/** Identifies the query a result set belongs to, so stale results are never shown. */
function queryKey(phrase: string, networkId: string): string {
  return `${networkId}|${phrase}`;
}

export default function Command() {
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [isLoadingKey, setIsLoadingKey] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // A failed storage read falls through to setup instead of loading forever.
    getApiKey()
      .catch(() => undefined)
      .then((key) => {
        if (cancelled) return;
        setApiKey(key);
        setIsLoadingKey(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoadingKey) {
    return <List isLoading />;
  }

  if (!apiKey) {
    return <Onboarding reason="missing" onDone={setApiKey} />;
  }

  return <SearchView apiKey={apiKey} onApiKeyChange={setApiKey} />;
}

function SearchView({ apiKey, onApiKeyChange }: { apiKey: string; onApiKeyChange: (apiKey: string) => void }) {
  const [searchText, setSearchText] = useState("");
  const [debouncedText, setDebouncedText] = useState("");
  const [networkId, setNetworkId] = useState<string>("all");
  const [results, setResults] = useState<TokenResult[]>([]);
  const [resultsKey, setResultsKey] = useState<string | undefined>(undefined);
  const [isSearching, setIsSearching] = useState(false);
  const [emptyState, setEmptyState] = useState<EmptyState>("none");
  const [invalidKey, setInvalidKey] = useState(false);
  const [recents, setRecents] = useState<TokenResult[]>([]);
  const [recentsLoaded, setRecentsLoaded] = useState(false);

  // Detail pane is off by default so rows get the full width; ⌘D toggles it.
  const { value: showDetail = false, setValue: setShowDetail } = useLocalStorage<boolean>("showDetail", false);
  const toggleDetail = useCallback(() => void setShowDetail(!showDetail), [showDetail, setShowDetail]);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: networks, isLoading: networksLoading } = useCachedPromise((key: string) => getNetworks(key), [apiKey], {
    initialData: [] as Network[],
    onError: (error) => {
      if (error instanceof CodexError && error.kind === "invalid-key") {
        setInvalidKey(true);
        return;
      }
      void showToast({ style: Toast.Style.Failure, title: "Failed to load networks", message: error.message });
    },
  });

  // Debounce the raw search text; only commit it after typing pauses.
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedText(searchText);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchText]);

  // Load recents whenever the search box is empty.
  useEffect(() => {
    if (debouncedText.trim() !== "") return;
    let cancelled = false;
    getRecents().then((stored) => {
      if (cancelled) return;
      setRecents(stored);
      setRecentsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedText]);

  // Run the search once the debounced text (or the selected network) changes.
  // Cancels the in-flight request when either changes again, or on unmount.
  useEffect(() => {
    const phrase = debouncedText.trim();
    if (phrase === "") {
      // Clearing the field aborts the in-flight search, whose own reset is skipped.
      setIsSearching(false);
      return;
    }
    const key = queryKey(phrase, networkId);

    const controller = new AbortController();
    setIsSearching(true);

    searchTokens(apiKey, phrase, {
      networkId: networkId === "all" ? undefined : Number(networkId),
      signal: controller.signal,
    })
      .then((tokens) => {
        if (controller.signal.aborted) return;
        setResults(tokens);
        setResultsKey(key);
        setEmptyState(tokens.length === 0 ? "no-results" : "none");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        setResults([]);
        setResultsKey(key);
        setEmptyState("error");

        if (!(error instanceof CodexError)) {
          void showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: error instanceof Error ? error.message : String(error),
          });
          return;
        }

        switch (error.kind) {
          case "invalid-key":
            setInvalidKey(true);
            break;
          case "quota":
            setEmptyState("quota");
            break;
          case "rate-limit":
            void showToast({ style: Toast.Style.Failure, title: "Too many requests, try again in a moment" });
            break;
          case "network":
          case "unknown":
          default:
            void showToast({ style: Toast.Style.Failure, title: "Search failed", message: error.message });
            break;
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsSearching(false);
      });

    return () => controller.abort();
  }, [apiKey, debouncedText, networkId]);

  const handleOpen = useCallback(async (token: TokenResult) => {
    await addRecent(token);
    setRecents(await getRecents());
  }, []);

  const handleClearRecents = useCallback(() => {
    void clearRecents().then(() => {
      setRecents([]);
      void showToast({ style: Toast.Style.Success, title: "Cleared recents" });
    });
  }, []);

  if (invalidKey) {
    return (
      <Onboarding
        reason="rejected"
        onDone={(key) => {
          setInvalidKey(false);
          onApiKeyChange(key);
        }}
      />
    );
  }

  // Use the live search text, not the debounced one: Enter must never open a
  // recent or a previous query's result while the current query is pending.
  const phrase = searchText.trim();
  const isEmptySearch = phrase === "";
  const isCurrent = resultsKey === queryKey(phrase, networkId);
  const items = isEmptySearch ? recents : isCurrent ? results : [];
  const isLoading = networksLoading || isSearching || (isEmptySearch ? !recentsLoaded : !isCurrent);

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      throttle={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isShowingDetail={showDetail && items.length > 0}
      searchBarPlaceholder="Token name, symbol, or address"
      searchBarAccessory={<NetworkDropdown networks={networks ?? []} onChange={setNetworkId} />}
    >
      {isEmptySearch ? (
        recents.length === 0 ? (
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title="Search Defined.fi"
            description="Type a token name, symbol, or contract address"
          />
        ) : (
          <List.Section title="Recent">
            {recents.map((token) => (
              <TokenListItem
                key={token.id}
                token={token}
                onOpen={handleOpen}
                showDetail={showDetail}
                onToggleDetail={toggleDetail}
                recent
                onClearRecents={handleClearRecents}
              />
            ))}
          </List.Section>
        )
      ) : !isCurrent ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching…" />
      ) : emptyState === "quota" ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Monthly Codex.io limit reached"
          description="The free Codex.io plan includes 10,000 requests per month. Upgrade your plan or wait for the next monthly cycle."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Codex.io Dashboard" url="https://dashboard.codex.io/dashboard" />
            </ActionPanel>
          }
        />
      ) : emptyState === "no-results" ? (
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="No tokens found"
          description='Try the contract address, or "$SYMBOL" for an exact symbol match.'
        />
      ) : emptyState === "error" ? (
        <List.EmptyView icon={Icon.Warning} title="Search failed" description="Edit the search to try again." />
      ) : (
        results.map((token) => (
          <TokenListItem
            key={token.id}
            token={token}
            onOpen={handleOpen}
            showDetail={showDetail}
            onToggleDetail={toggleDetail}
          />
        ))
      )}
    </List>
  );
}

function NetworkDropdown({ networks, onChange }: { networks: Network[]; onChange: (value: string) => void }) {
  return (
    <List.Dropdown tooltip="Network" storeValue defaultValue="all" onChange={onChange}>
      <List.Dropdown.Item title="All Networks" value="all" />
      {networks.length > 0 && (
        <List.Dropdown.Section title="Networks">
          {networks.map((network) => (
            <List.Dropdown.Item key={network.id} title={network.name} value={String(network.id)} />
          ))}
        </List.Dropdown.Section>
      )}
    </List.Dropdown>
  );
}

function TokenListItem({
  token,
  onOpen,
  showDetail,
  onToggleDetail,
  recent,
  onClearRecents,
}: {
  token: TokenResult;
  onOpen: (token: TokenResult) => Promise<void>;
  showDetail: boolean;
  onToggleDetail: () => void;
  /** A recent token: stored without metrics, and offers Clear Recents. */
  recent?: boolean;
  onClearRecents?: () => void;
}) {
  return (
    <List.Item
      id={token.id}
      title={tokenLabels(token).title}
      subtitle={tokenLabels(token).subtitle}
      icon={token.imageUrl ? { source: token.imageUrl, fallback: Icon.Coins } : Icon.Coins}
      accessories={[
        { tag: token.networkSlug.toUpperCase(), tooltip: token.networkName },
        // Recents store no metrics; old numbers would read as current.
        ...(recent ? [] : metricAccessories(token, showDetail)),
      ]}
      detail={<TokenDetail token={token} metrics={!recent} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title="Open on Defined.fi" icon={Icon.Globe} onAction={() => void openOnDefined(token, onOpen)} />
            <Action.CopyToClipboard
              title="Copy Contract Address"
              content={token.address}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
            {token.explorerUrl && (
              <Action.OpenInBrowser
                title="Open on Block Explorer"
                url={token.explorerUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              />
            )}
            <Action
              title={showDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={onToggleDetail}
            />
          </ActionPanel.Section>
          {recent && (
            <ActionPanel.Section>
              <Action
                title="Clear Recents"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={onClearRecents}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function metricAccessories(token: TokenResult, showDetail: boolean): List.Item.Accessory[] {
  const color = changeColor(token.change24);
  const changeText = formatPercent(token.change24);
  return [
    { text: formatUsd(token.priceUsd), tooltip: "Price" },
    { text: color ? { value: changeText, color } : changeText, tooltip: "24h change" },
    // With the detail pane open these live there instead.
    ...(showDetail
      ? []
      : [
          { text: `Liq ${formatUsd(token.liquidityUsd)}`, tooltip: "Liquidity" },
          { text: `Vol ${formatUsd(token.volume24Usd)}`, tooltip: "24h volume" },
        ]),
  ];
}

function TokenDetail({ token, metrics }: { token: TokenResult; metrics: boolean }) {
  const color = changeColor(token.change24);
  const changeText = formatPercent(token.change24);

  return (
    <List.Item.Detail
      markdown={tokenHeaderMarkdown(token)}
      metadata={
        metrics && (
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Price" text={formatUsd(token.priceUsd)} />
            <List.Item.Detail.Metadata.Label
              title="24h Change"
              text={color ? { value: changeText, color } : changeText}
            />
            <List.Item.Detail.Metadata.Label title="Liquidity" text={formatUsd(token.liquidityUsd)} />
            <List.Item.Detail.Metadata.Label title="24h Volume" text={formatUsd(token.volume24Usd)} />
            <List.Item.Detail.Metadata.Label title="Market Cap" text={formatUsd(token.marketCapUsd)} />
          </List.Item.Detail.Metadata>
        )
      }
    />
  );
}

/**
 * Saves the token to recents before opening it. Action.OpenInBrowser fires
 * onOpen without awaiting it and closes the window, which unloads the command
 * before the LocalStorage write lands.
 */
async function openOnDefined(token: TokenResult, onOpen: (token: TokenResult) => Promise<void>) {
  try {
    await onOpen(token);
  } catch {
    // Recents are best-effort; a storage failure must not block opening the page.
  }
  await open(token.definedUrl);
  await closeMainWindow({ clearRootSearch: true, popToRootType: PopToRootType.Immediate });
}

function changeColor(change?: number): Color | undefined {
  if (change === undefined || Number.isNaN(change) || isFlatChange(change)) return undefined;
  return change >= 0 ? Color.Green : Color.Red;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
