import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  LaunchType,
  List,
  confirmAlert,
  launchCommand,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { marketLogo } from "./market-logo";
import { formatAge, quoteFreshness } from "./market-format";
import { QuoteDetail } from "./quote-detail";
import {
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

async function loadWatchlist() {
  const [ids, quotes, primary, statuses] = await Promise.all([
    getWatchlist(),
    getCachedQuotes(),
    getPrimaryAssetId(),
    getQuoteStatuses(),
  ]);
  return { ids, quotes, primary, statuses };
}

export default function Command() {
  const { data, isLoading, mutate } = useCachedPromise(loadWatchlist);
  const watchlist = data?.ids ?? [];
  const quotes = data?.quotes ?? {};
  const primaryAssetId = data?.primary;
  const statuses = data?.statuses ?? {};

  async function reload() {
    await mutate(loadWatchlist());
  }

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
                  onAction={() =>
                    removeAndReload(id, quote?.name ?? id, reload)
                  }
                />
                <Action
                  title="Update Market Data"
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
      {data && watchlist.length === 0 ? (
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
      ) : null}
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
    title: "Updating market data",
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

async function removeAndReload(
  id: string,
  name: string,
  reload: () => Promise<void>,
) {
  const confirmed = await confirmAlert({
    title: "Remove from Watchlist",
    message: `Remove ${name} from Ticker Bar?`,
    primaryAction: {
      title: "Remove",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;
  await removeFromWatchlist(id);
  await reload();
  await refreshMenuBar({ renderOnly: true });
  await showToast({
    style: Toast.Style.Success,
    title: "Removed from Ticker Bar",
  });
}

async function resetAndReload(reload: () => Promise<void>) {
  const confirmed = await confirmAlert({
    title: "Reset Watchlist",
    message: "Replace the current watchlist with the default assets?",
    primaryAction: {
      title: "Reset",
      style: Alert.ActionStyle.Destructive,
    },
  });
  if (!confirmed) return;
  await resetWatchlistToDefaults();
  await reload();
  await refreshMenuBar({ renderOnly: true });
  await showToast({ style: Toast.Style.Success, title: "Reset watchlist" });
}
