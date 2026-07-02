import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Icon,
  LaunchProps,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { getExplorerOverrides } from "./chains";
import { getChainLogoUrl } from "./chainLogos";
import { ExplorerUrl, InputType, LookupResult, WorkerResponse } from "./types";

interface DisplayResult {
  chainId: string;
  chainName: string;
  symbol: string;
  inputType: InputType;
  explorerUrls: ExplorerUrl[];
  status: "found" | "not_found" | "unverified";
  isToken?: boolean;
  isTestnet?: boolean;
}

function applyExplorerOverride(
  result: LookupResult,
  overrides: Map<string, string>,
): DisplayResult {
  let explorerUrls = result.explorerUrls;

  const overrideBaseUrl = overrides.get(result.chainId);
  if (overrideBaseUrl && explorerUrls.length > 0) {
    const first = explorerUrls[0];
    const originalUrl = new URL(first.url);
    // Strip the override's path prefix from the original pathname to avoid doubling
    // (e.g. Mintscan base URLs include a chain path like /osmosis)
    let relativePath = originalUrl.pathname;
    try {
      const basePath = new URL(overrideBaseUrl).pathname.replace(/\/+$/, "");
      if (basePath && relativePath.startsWith(basePath)) {
        relativePath = relativePath.slice(basePath.length);
      }
    } catch {
      /* invalid override URL, use full pathname */
    }
    const cleanBase = overrideBaseUrl.replace(/\/+$/, "");
    const overriddenUrl = `${cleanBase}${relativePath}${originalUrl.search}${originalUrl.hash}`;
    explorerUrls = [
      { name: first.name, url: overriddenUrl },
      ...explorerUrls.slice(1),
    ];
  }

  return {
    chainId: result.chainId,
    chainName: result.chainName,
    symbol: result.symbol,
    inputType: result.inputType,
    explorerUrls,
    status: result.status,
    isToken: result.isToken,
    isTestnet: result.isTestnet,
  };
}

const NAME_PATTERN = /\.(eth|sol|bnb|osmo|cosmos)$/i;

function isNameInput(input: string): boolean {
  return NAME_PATTERN.test(input.trim());
}

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

async function fetchWorker(
  input: string,
  workerUrl: string,
  verify: boolean,
): Promise<WorkerResponse> {
  const response = await fetch(`${workerUrl}/lookup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input, verify }),
  });

  if (!response.ok) {
    throw new Error(`Worker returned ${response.status}`);
  }

  return (await response.json()) as WorkerResponse;
}

export default function SearchCommand(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [verifiedResults, setVerifiedResults] = useState<LookupResult[] | null>(
    null,
  );
  const [verifyingInput, setVerifyingInput] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [nameNotFound, setNameNotFound] = useState(false);
  const [coinGeckoUrl, setCoinGeckoUrl] = useState<string | null>(null);

  const prefs = getPreferenceValues<Preferences>();
  const workerUrl = prefs.workerUrl;

  // Clipboard auto-fill is opt-in: it reads the clipboard and triggers a lookup
  // (which sends the contents to the worker) without explicit user action, so it
  // is off by default to avoid sending unrelated copied data — e.g. a private key
  // or token — off-device. Only read the clipboard when the user enables it.
  const { data: clipboardText } = usePromise(
    async () => {
      const clip = await Clipboard.readText();
      return clip?.trim() ?? "";
    },
    [],
    { execute: prefs.autoFillFromClipboard === true },
  );

  // Auto-fill from clipboard on launch (skip if launched via fallback)
  useEffect(() => {
    if (clipboardText && !searchText && !props.fallbackText) {
      const clip = clipboardText.trim();
      // Accept long addresses/hashes OR short name-service inputs
      if (
        (clip.length >= 20 && /^[a-zA-Z0-9._:-]+$/.test(clip)) ||
        isNameInput(clip)
      ) {
        setSearchText(clip);
      }
    }
  }, [clipboardText]);

  const explorerOverrides = useMemo(() => getExplorerOverrides(), []);

  // Phase 1: instant detection (verify=false)
  const { data: detectResponse, isLoading: isDetecting } = usePromise(
    async (input: string) => {
      if (!input.trim()) return null;
      const resp = await fetchWorker(input.trim(), workerUrl, false);
      // Track resolution state from Phase 1
      if (resp.resolvedName && resp.resolvedAddress) {
        setResolvedName(resp.resolvedName);
        setResolvedAddress(resp.resolvedAddress);
        setNameNotFound(false);
      } else if (resp.nameNotFound) {
        setResolvedName(null);
        setResolvedAddress(null);
        setNameNotFound(true);
      } else {
        setResolvedName(null);
        setResolvedAddress(null);
        setNameNotFound(false);
      }
      // For single-match results, token info comes back in Phase 1
      if (resp.results.length === 1 && resp.coinGeckoUrl) {
        setCoinGeckoUrl(resp.coinGeckoUrl);
      }
      return resp;
    },
    [searchText],
    { execute: searchText.trim().length > 0 },
  );

  const detectResults = detectResponse?.results ?? null;

  // Phase 2: kick off verification in background when detection returns multiple results
  // For name resolution, send the resolved address directly to skip re-resolution
  const trimmedSearch = searchText.trim();
  const phase2Input = resolvedAddress ?? trimmedSearch;
  useEffect(() => {
    if (
      !detectResults ||
      detectResults.length <= 1 ||
      trimmedSearch !== verifyingInput
    ) {
      // Clear stale verified results when input changes
      if (trimmedSearch !== verifyingInput) {
        setVerifiedResults(null);
        setCoinGeckoUrl(null);
      }
    }
    if (!detectResults || detectResults.length <= 1 || !trimmedSearch) return;
    if (trimmedSearch === verifyingInput && verifiedResults) return;

    setVerifyingInput(trimmedSearch);
    let cancelled = false;
    fetchWorker(phase2Input, workerUrl, true)
      .then((resp) => {
        if (!cancelled) {
          setVerifiedResults(resp.results);
          setCoinGeckoUrl(resp.coinGeckoUrl ?? null);
        }
      })
      .catch(() => {
        // Verification failed — fall back to the unverified detection results
        // rather than leaving the UI stuck in a loading state.
        if (!cancelled) setVerifiedResults(detectResults);
      });
    return () => {
      cancelled = true;
    };
  }, [detectResults, trimmedSearch]);

  // Use verified results when available, otherwise detection results
  const lookupResults =
    verifiedResults && verifyingInput === trimmedSearch
      ? verifiedResults
      : detectResults;
  const isVerifying =
    !!detectResults &&
    detectResults.length > 1 &&
    (!verifiedResults || verifyingInput !== trimmedSearch);
  const isLoading = isDetecting || isVerifying;

  // Apply local explorer overrides — hide results while verifying to avoid flash of unverified list
  const displayResults: DisplayResult[] = useMemo(() => {
    if (!lookupResults || lookupResults.length === 0 || isVerifying) return [];
    return lookupResults.map((r) =>
      applyExplorerOverride(r, explorerOverrides),
    );
  }, [lookupResults, explorerOverrides, isVerifying]);

  // Determine section grouping
  const inputType = displayResults[0]?.inputType;
  const isAddress = inputType === "address";

  const foundResults = displayResults.filter((r) => r.status === "found");
  const unverifiedResults = displayResults.filter(
    (r) => r.status === "unverified",
  );

  // For addresses: if all results are unverified (no activity anywhere), show as "All Matching"
  const addressFallback =
    isAddress &&
    displayResults.length > 1 &&
    foundResults.length === 0 &&
    unverifiedResults.length === displayResults.length;

  const sectioned = useMemo(() => {
    if (addressFallback) {
      return { allMatching: displayResults, verified: [], unverified: [] };
    }
    return {
      allMatching: [],
      verified: foundResults,
      unverified: unverifiedResults,
    };
  }, [addressFallback, displayResults, foundResults, unverifiedResults]);

  // The address to show in copy actions — resolved address or raw input
  const copyAddress = resolvedAddress ?? searchText.trim();

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Paste address, tx hash, or name (vitalik.eth, toly.sol)..."
      isLoading={isLoading}
      throttle
    >
      {isVerifying && searchText.trim() ? (
        <List.EmptyView
          title="Searching across networks..."
          description="Verifying activity on matching chains"
          icon={Icon.Globe}
        />
      ) : nameNotFound && !isLoading ? (
        <List.EmptyView
          title="Name not found"
          description={`Could not resolve "${searchText.trim()}" to an address`}
          icon={Icon.XMarkCircle}
        />
      ) : displayResults.length === 0 && searchText.trim() && !isLoading ? (
        <List.EmptyView
          title="No chains detected"
          description="Try pasting a valid crypto address or transaction hash"
          icon={Icon.MagnifyingGlass}
        />
      ) : !searchText.trim() ? (
        <List.EmptyView
          title="Search Crypto Address / Transaction"
          description="Paste or type any crypto address, transaction hash, or name (e.g. vitalik.eth)"
          icon={Icon.MagnifyingGlass}
        />
      ) : null}

      {resolvedName && resolvedAddress && displayResults.length > 0 && (
        <List.Section title="Name Resolution">
          <List.Item
            title={resolvedName}
            subtitle={truncateAddress(resolvedAddress)}
            icon={{ source: Icon.Link, tintColor: Color.Purple }}
            accessories={[{ tag: { value: "Resolved", color: Color.Purple } }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Resolved Address"
                  content={resolvedAddress}
                />
                <Action.CopyToClipboard
                  title="Copy Name"
                  content={resolvedName}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {sectioned.allMatching.length > 0 && (
        <List.Section title="No activity found — potential matches">
          {sectioned.allMatching.map((result) => (
            <ResultItem
              key={`${result.chainId}-${result.inputType}`}
              result={result}
              query={copyAddress}
              coinGeckoUrl={coinGeckoUrl}
            />
          ))}
        </List.Section>
      )}

      {sectioned.verified.length > 0 && (
        <List.Section title="Verified">
          {sectioned.verified.map((result) => (
            <ResultItem
              key={`${result.chainId}-${result.inputType}`}
              result={result}
              query={copyAddress}
              coinGeckoUrl={coinGeckoUrl}
            />
          ))}
        </List.Section>
      )}

      {sectioned.unverified.length > 0 && (
        <List.Section
          title={
            sectioned.verified.length > 0 ? "Other Chains" : "Detected Chains"
          }
        >
          {sectioned.unverified.map((result) => (
            <ResultItem
              key={`${result.chainId}-${result.inputType}`}
              result={result}
              query={copyAddress}
              coinGeckoUrl={coinGeckoUrl}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function ResultItem({
  result,
  query,
  coinGeckoUrl,
}: {
  result: DisplayResult;
  query: string;
  coinGeckoUrl?: string | null;
}) {
  const {
    chainName,
    symbol,
    inputType,
    explorerUrls,
    status,
    isToken,
    isTestnet,
  } = result;
  const typeLabel =
    inputType === "address"
      ? "Address"
      : inputType === "validator"
        ? "Validator"
        : inputType === "denom"
          ? "Denom"
          : "Transaction";
  const tagColor =
    inputType === "address" || inputType === "validator"
      ? Color.Blue
      : Color.Green;

  const primaryUrl = explorerUrls[0]?.url ?? "";
  const additionalExplorers = explorerUrls.slice(1);

  const logoUrl = getChainLogoUrl(chainName);

  const accessories: List.Item.Accessory[] = [];

  if (isTestnet) {
    accessories.push({ tag: { value: "Testnet", color: Color.Yellow } });
  }

  if (status === "found") {
    accessories.push({
      icon: { source: Icon.Checkmark, tintColor: Color.Green },
      tooltip: "Verified on-chain",
    });
  }

  if (isToken) {
    accessories.push({ tag: { value: "Token", color: Color.Orange } });
  } else {
    accessories.push({ tag: { value: typeLabel, color: tagColor } });
  }

  // For tokens: DexScreener first, then CoinGecko, then explorers
  // For non-tokens: explorers as before
  return (
    <List.Item
      title={chainName}
      subtitle={symbol}
      icon={logoUrl ? { source: logoUrl } : Icon.Globe}
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title={`Open in ${explorerUrls[0]?.name ?? "Explorer"}`}
            url={primaryUrl}
          />
          {isToken && coinGeckoUrl && (
            <Action.OpenInBrowser
              title="Open in CoinGecko"
              url={coinGeckoUrl}
            />
          )}
          {additionalExplorers.map((explorer) => (
            <Action.OpenInBrowser
              key={explorer.name}
              title={`Open in ${explorer.name}`}
              url={explorer.url}
            />
          ))}
          <Action.CopyToClipboard
            title="Copy Explorer URL"
            content={primaryUrl}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Input"
            content={query.trim()}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
