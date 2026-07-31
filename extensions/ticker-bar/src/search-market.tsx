import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [popular, setPopular] = useState<SearchResult[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(true);
  const visibleResults = query.trim() ? results : popular;

  useEffect(() => {
    getWatchlist().then(setWatchlist);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingPopular(true);
    popularMarkets()
      .then((items) => {
        if (!cancelled) setPopular(items);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPopular(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const matches = await searchMarkets(query, controller.signal);
        if (!cancelled) setResults(matches);
      } catch (error) {
        if (!cancelled) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Market search failed",
            message:
              error instanceof Error ? error.message : "Please try again",
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <List
      isLoading={isLoading || (!query.trim() && isLoadingPopular)}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search AAPL, BTC, token address, or Polymarket topic"
    >
      <List.EmptyView
        title={query.trim() ? "No matches" : "No trending markets"}
        description={
          query.trim()
            ? "Try a ticker, coin, token address, or Polymarket topic"
            : "Search for a ticker, coin, token, or Polymarket topic"
        }
        icon={Icon.MagnifyingGlass}
      />
      <List.Section title={query.trim() ? "Results" : "Trending"}>
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
                        onAction={() => setPrimary(result, setWatchlist)}
                      />
                      <Action
                        title="Remove from Watchlist"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["ctrl"], key: "x" }}
                        onAction={() => remove(result, setWatchlist)}
                      />
                    </>
                  ) : (
                    <>
                      <Action
                        title="Add to Watchlist"
                        icon={Icon.Plus}
                        onAction={() => add(result, false, setWatchlist)}
                      />
                      <Action
                        title="Add and Set as Primary"
                        icon={Icon.Star}
                        onAction={() => add(result, true, setWatchlist)}
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
  setWatchlist: (ids: string[]) => void,
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
  setWatchlist(await getWatchlist());
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
  setWatchlist: (ids: string[]) => void,
) {
  await setPrimaryAssetId(result.id);
  const report = await refreshQuotes([result.id], { force: true });
  setWatchlist(await getWatchlist());
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
  setWatchlist: (ids: string[]) => void,
) {
  await removeFromWatchlist(result.id);
  setWatchlist(await getWatchlist());
  await refreshMenuBar({ renderOnly: true });
  await showToast({
    style: Toast.Style.Success,
    title: "Removed from Ticker Bar",
    message: result.symbol,
  });
}

function iconFor(kind: SearchResult["kind"]) {
  if (kind === "stock") return Icon.BankNote;
  if (kind === "crypto") return Icon.Coins;
  if (kind === "token") return Icon.Link;
  if (kind === "binance") return Icon.Coins;
  if (kind === "binanceperp") return Icon.LineChart;
  return Icon.BarChart;
}

function colorFor(kind: SearchResult["kind"]) {
  if (kind === "stock") return Color.Blue;
  if (kind === "crypto") return Color.Yellow;
  if (kind === "token") return Color.Green;
  if (kind === "binance") return Color.Orange;
  if (kind === "binanceperp") return Color.Yellow;
  return Color.Purple;
}
