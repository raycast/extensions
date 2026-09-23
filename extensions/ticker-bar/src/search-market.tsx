import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  launchCommand,
  LaunchType,
  confirmAlert,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { marketLogo } from "./market-logo";
import { QuoteDetail } from "./quote-detail";
import {
  SearchResult,
  addToWatchlist,
  getWatchlist,
  popularMarkets,
  refreshMenuBar,
  refreshQuotes,
  removeFromWatchlist,
  searchMarkets,
  setPrimaryAssetId,
} from "./market";

export default function Command() {
  const [query, setQuery] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const trimmedQuery = query.trim();
  const { data: watchlist = [], mutate: mutateWatchlist } =
    useCachedPromise(getWatchlist);
  const { data: popular = [], isLoading: isLoadingPopular } =
    useCachedPromise(popularMarkets);
  const { data: results = [], isLoading } = useCachedPromise(
    (searchQuery: string) =>
      searchMarkets(searchQuery, abortable.current?.signal),
    [trimmedQuery],
    {
      abortable,
      execute: trimmedQuery.length > 0,
      keepPreviousData: true,
      failureToastOptions: { title: "Market search failed" },
    },
  );
  const visibleResults = trimmedQuery ? results : popular;

  return (
    <List
      isLoading={isLoading || (!trimmedQuery && isLoadingPopular)}
      filtering={false}
      throttle
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search AAPL, BTC, token address, or Polymarket topic"
    >
      <List.EmptyView
        title={trimmedQuery ? "No matches" : "No trending markets"}
        description={
          trimmedQuery
            ? "Try a ticker, coin, token address, or Polymarket topic"
            : "Search for a ticker, coin, token, or Polymarket topic"
        }
        icon={Icon.MagnifyingGlass}
      />
      <List.Section title={trimmedQuery ? "Results" : "Trending"}>
        {visibleResults.map((result) => {
          const isAdded = watchlist.includes(result.id);
          return (
            <List.Item
              key={result.id}
              title={result.name}
              subtitle={result.subtitle}
              icon={
                marketLogo(result, iconFor(result.kind)) ?? {
                  source: iconFor(result.kind),
                  tintColor: colorFor(result.kind),
                }
              }
              accessories={[
                isAdded ? { tag: "Added" } : { text: result.symbol },
                { tag: result.provider },
              ]}
              actions={
                <ActionPanel>
                  {isAdded ? (
                    <>
                      <Action
                        title="Set as Primary Ticker"
                        icon={Icon.Star}
                        onAction={() => setPrimary(result, mutateWatchlist)}
                      />
                      <Action
                        title="Remove from Watchlist"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={() => remove(result, mutateWatchlist)}
                      />
                    </>
                  ) : (
                    <>
                      <Action
                        title="Add to Watchlist"
                        icon={Icon.Plus}
                        onAction={() => add(result, false, mutateWatchlist)}
                      />
                      <Action
                        title="Add and Set as Primary"
                        icon={Icon.Star}
                        onAction={() => add(result, true, mutateWatchlist)}
                      />
                    </>
                  )}
                  <Action.Push
                    title="View Market Details"
                    icon={Icon.Sidebar}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                    target={<QuoteDetail id={result.id} />}
                  />
                  <Action
                    title="Manage Watchlist"
                    icon={Icon.List}
                    onAction={() =>
                      launchCommand({
                        name: "manage-watchlist",
                        type: LaunchType.UserInitiated,
                      })
                    }
                  />
                  {result.url ? (
                    <Action.OpenInBrowser url={result.url} />
                  ) : null}
                  <Action.CopyToClipboard
                    title="Copy Asset ID"
                    content={result.id}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

async function add(
  result: SearchResult,
  setPrimary: boolean,
  reloadWatchlist: (update: Promise<string[]>) => Promise<string[]>,
) {
  let id: string | undefined;
  try {
    id = await addToWatchlist(result.id);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not add asset",
      message: error instanceof Error ? error.message : "Please try again",
    });
    return;
  }
  if (!id) return;
  if (setPrimary) await setPrimaryAssetId(id);
  const report = await refreshQuotes([id], { force: true });
  await reloadWatchlist(getWatchlist());
  await refreshMenuBar({ renderOnly: true });
  await showToast({
    style: report.failures.length ? Toast.Style.Failure : Toast.Style.Success,
    title: report.failures.length
      ? "Added, but quote is unavailable"
      : setPrimary
        ? "Primary ticker updated"
        : "Added to Ticker Bar",
    message: report.failures[0]?.message ?? result.id,
  });
}

async function setPrimary(
  result: SearchResult,
  reloadWatchlist: (update: Promise<string[]>) => Promise<string[]>,
) {
  await setPrimaryAssetId(result.id);
  const report = await refreshQuotes([result.id], { force: true });
  await reloadWatchlist(getWatchlist());
  await refreshMenuBar({ renderOnly: true });
  await showToast({
    style: report.failures.length ? Toast.Style.Failure : Toast.Style.Success,
    title: report.failures.length
      ? "Primary set; quote unavailable"
      : "Primary ticker updated",
    message: report.failures[0]?.message ?? result.symbol,
  });
}

async function remove(
  result: SearchResult,
  reloadWatchlist: (update: Promise<string[]>) => Promise<string[]>,
) {
  const confirmed = await confirmAlert({
    title: "Remove from Watchlist",
    message: `Remove ${result.symbol} from Ticker Bar?`,
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;
  await removeFromWatchlist(result.id);
  await reloadWatchlist(getWatchlist());
  await refreshMenuBar({ renderOnly: true });
  await showToast({
    style: Toast.Style.Success,
    title: "Removed from Ticker Bar",
    message: result.symbol,
  });
}

function iconFor(kind: SearchResult["kind"]) {
  switch (kind) {
    case "stock":
      return Icon.BankNote;
    case "crypto":
      return Icon.Coins;
    case "token":
      return Icon.Link;
    case "binance":
      return Icon.Coins;
    case "binanceperp":
      return Icon.LineChart;
    case "polymarket":
      return Icon.BarChart;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function colorFor(kind: SearchResult["kind"]) {
  switch (kind) {
    case "stock":
      return Color.Blue;
    case "crypto":
      return Color.Yellow;
    case "token":
      return Color.Green;
    case "binance":
      return Color.Orange;
    case "binanceperp":
      return Color.Yellow;
    case "polymarket":
      return Color.Purple;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}
