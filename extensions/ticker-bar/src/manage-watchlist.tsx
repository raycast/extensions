import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchType,
  List,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { marketLogo } from "./market-logo";
import { formatAge, quoteFreshness } from "./market-format";
import { QuoteDetail } from "./quote-detail";
import {
  Quote,
  QuoteStatus,
  assetFromId,
  getCachedQuotes,
  getPrimaryAssetId,
  getQuoteStatuses,
  getWatchlist,
  moveWatchlistItem,
  refreshMenuBar,
  refreshQuotes,
  removeFromWatchlist,
  resetWatchlistToDefaults,
  setPrimaryAssetId,
} from "./market";

export default function Command() {
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [primaryAssetId, setPrimaryAssetIdValue] = useState<string>();
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [statuses, setStatuses] = useState<Record<string, QuoteStatus>>({});
  const [isLoading, setIsLoading] = useState(true);

  async function reload() {
    const [ids, cached, primary, quoteStatuses] = await Promise.all([
      getWatchlist(),
      getCachedQuotes(),
      getPrimaryAssetId(),
      getQuoteStatuses(),
    ]);
    setWatchlist(ids);
    setQuotes(cached);
    setPrimaryAssetIdValue(primary);
    setStatuses(quoteStatuses);
    setIsLoading(false);
  }

  useEffect(() => {
    reload();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter watchlist">
      {watchlist.map((id) => {
        const asset = assetFromId(id);
        const quote = quotes[id];
        const isPrimary = id === primaryAssetId;
        const freshness = quoteFreshness(quote);
        const status = statuses[id];
        return (
          <List.Item
            key={id}
            title={quote?.name ?? asset?.name ?? id}
            subtitle={id}
            accessories={[
              ...(isPrimary ? [{ tag: "Primary" }] : []),
              ...(freshness === "stale" || status?.error
                ? [{ tag: { value: "Stale", color: Color.Orange } }]
                : []),
              {
                text: quote?.priceLabel ?? "No quote",
                tooltip: quote?.error ?? status?.error,
              },
              ...(quote?.lastSuccessAt
                ? [
                    {
                      text: formatAge(quote.lastSuccessAt),
                      tooltip: quote.error ?? "Last successful refresh",
                    },
                  ]
                : []),
              { tag: quote?.provider ?? asset?.provider },
            ]}
            icon={
              marketLogo(quote, isPrimary ? Icon.Star : Icon.LineChart) ??
              (isPrimary ? Icon.Star : Icon.LineChart)
            }
            actions={
              <ActionPanel>
                <Action
                  title="Set as Primary Ticker"
                  icon={Icon.Star}
                  onAction={() => setPrimaryAndReload(id, reload)}
                />
                <Action.Push
                  title="View Market Details"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  target={<QuoteDetail id={id} initialQuote={quote} />}
                />
                <Action
                  title="Remove from Watchlist"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => removeAndReload(id, reload)}
                />
                <Action
                  title="Refresh Prices"
                  icon={Icon.ArrowClockwise}
                  onAction={() => refreshAndReload(watchlist, reload)}
                />
                <Action
                  title="Move up"
                  icon={Icon.ArrowUp}
                  shortcut={{ modifiers: ["cmd"], key: "arrowUp" }}
                  onAction={() => moveAndReload(id, "up", reload)}
                />
                <Action
                  title="Move Down"
                  icon={Icon.ArrowDown}
                  shortcut={{ modifiers: ["cmd"], key: "arrowDown" }}
                  onAction={() => moveAndReload(id, "down", reload)}
                />
                <Action.CopyToClipboard title="Copy Asset ID" content={id} />
                <Action
                  title="Browse Markets"
                  icon={Icon.MagnifyingGlass}
                  onAction={() =>
                    launchCommand({
                      name: "search-market",
                      type: LaunchType.UserInitiated,
                    })
                  }
                />
                <Action
                  title="Advanced Watchlist Editor"
                  icon={Icon.Gear}
                  onAction={() =>
                    launchCommand({
                      name: "configure-ticker-bar",
                      type: LaunchType.UserInitiated,
                    })
                  }
                />
              </ActionPanel>
            }
          />
        );
      })}
      <List.EmptyView
        title="No watchlist items"
        description="Browse markets to add stocks, crypto, tokens, or Polymarket outcomes."
        actions={
          <ActionPanel>
            <Action
              title="Browse Markets"
              icon={Icon.MagnifyingGlass}
              onAction={() =>
                launchCommand({
                  name: "search-market",
                  type: LaunchType.UserInitiated,
                })
              }
            />
            <Action
              title="Advanced Watchlist Editor"
              icon={Icon.Gear}
              onAction={() =>
                launchCommand({
                  name: "configure-ticker-bar",
                  type: LaunchType.UserInitiated,
                })
              }
            />
            <Action
              title="Reset to Defaults"
              icon={Icon.RotateClockwise}
              onAction={() => resetAndReload(reload)}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}

async function setPrimaryAndReload(id: string, reload: () => Promise<void>) {
  await setPrimaryAssetId(id);
  await reload();
  await refreshMenuBar({ renderOnly: true });
  await showToast({
    style: Toast.Style.Success,
    title: "Primary ticker updated",
  });
}

async function moveAndReload(
  id: string,
  direction: "up" | "down",
  reload: () => Promise<void>,
) {
  await moveWatchlistItem(id, direction);
  await reload();
  await refreshMenuBar({ renderOnly: true });
}

async function refreshAndReload(ids: string[], reload: () => Promise<void>) {
  await showToast({
    style: Toast.Style.Animated,
    title: "Refreshing Ticker Bar",
  });
  const report = await refreshQuotes(ids, { force: true });
  await reload();
  await refreshMenuBar({ renderOnly: true });
  await showToast(
    report.failures.length
      ? {
          style: Toast.Style.Failure,
          title: "Some quotes could not refresh",
          message: `${report.updatedIds.length} updated · ${report.failures.length} failed`,
        }
      : {
          style: Toast.Style.Success,
          title: "Ticker Bar refreshed",
          message: `${report.updatedIds.length} quotes updated`,
        },
  );
}

async function removeAndReload(id: string, reload: () => Promise<void>) {
  await removeFromWatchlist(id);
  await reload();
  await refreshMenuBar({ renderOnly: true });
  await showToast({
    style: Toast.Style.Success,
    title: "Removed from Ticker Bar",
  });
}

async function resetAndReload(reload: () => Promise<void>) {
  await resetWatchlistToDefaults();
  await reload();
  await refreshMenuBar({ renderOnly: true });
  await showToast({ style: Toast.Style.Success, title: "Reset watchlist" });
}
