import { List, ActionPanel, Action, Color, Icon, showToast, Toast, Detail } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { fetchLeaderboard, fetchPositions, fetchClosedPositions, fetchEventTicker } from "../../../api/traders";
import { PublicProfile, Position, ClosedPosition } from "../types";
import { formatAddress, formatCurrency } from "../../../utils/formatters";
import { getMarketUrl } from "../../markets/helpers";
import { MarketDetails } from "../../markets/components/MarketDetails";

/**
 * Intermediate Component to fetch Market Details for a given Position.
 * Resolves the Event/Ticker by slug, targets the conditionId, and injects the MarketDetails view.
 */
function PositionMarketDetailsFetcher({ pos }: { pos: Position | ClosedPosition }) {
  // We use useCachedPromise combined with the centralized fetchWithHandling helper
  // to ensure 429 Rate Limits and 404 caching hits correctly handle the payload.
  const { data: ticker, isLoading } = useCachedPromise(fetchEventTicker, [pos.slug]);

  if (isLoading) {
    return <Detail isLoading={true} markdown="*Loading market charts and metadata...*" />;
  }

  if (!ticker) {
    return <Detail markdown="**Error:** Market Event Not Found. The Gamma API might have archived this slug." />;
  }

  const matchedMarket = ticker.markets.find((m) => m.conditionId === pos.conditionId);
  if (!matchedMarket) {
    return <Detail markdown="**Error:** Market Condition Not Found inside the Event." />;
  }

  return <MarketDetails market={matchedMarket} ticker={ticker} />;
}

/**
 * Renders the Detailed Profile view for a specific Polymarket user.
 * Displays their PnL analytics, paginated active positions, and paginated trade history.
 *
 * @param props.address - The 42-character 0x proxy wallet address.
 * @param props.profile - (Optional) The public profile object if available.
 */
export function ProfileDetail({ address, profile }: { address: string; profile?: PublicProfile }) {
  const [searchText, setSearchText] = useState("");
  const name = formatAddress(profile?.name || profile?.pseudonym || "") || "Profile";

  // === States for PnL Analytics ===
  const [dayPnl, setDayPnl] = useState<number | null>(null);
  const [weekPnl, setWeekPnl] = useState<number | null>(null);
  const [monthPnl, setMonthPnl] = useState<number | null>(null);
  const [allPnl, setAllPnl] = useState<number | null>(null);

  // === States for Positions and History (Arrays) ===
  const [activePositions, setActivePositions] = useState<Position[]>([]);
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([]);

  // === States for Pagination and "Load More" Tracking ===
  const [activeOffset, setActiveOffset] = useState(0);
  const [closedOffset, setClosedOffset] = useState(0);
  const [hasMoreActive, setHasMoreActive] = useState(true);
  const [hasMoreClosed, setHasMoreClosed] = useState(true);

  // === Loading States ===
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingActive, setIsLoadingActive] = useState(true);
  const [isLoadingClosed, setIsLoadingClosed] = useState(true);

  // Maximum items fetched per API request
  const PAGE_SIZE = 10;

  /**
   * Effect: Fetches the high-level PnL statistics across 4 timeframes (Once on mount).
   * Runs exactly once when the component initially mounts for the given address.
   */
  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      setIsLoadingStats(true);
      try {
        // Execute all leaderboard timeframe queries concurrently for better performance
        const [d, w, m, a] = await Promise.all([
          fetchLeaderboard(address, "OVERALL", "DAY"),
          fetchLeaderboard(address, "OVERALL", "WEEK"),
          fetchLeaderboard(address, "OVERALL", "MONTH"),
          fetchLeaderboard(address, "OVERALL", "ALL"),
        ]);

        if (isMounted) {
          // Update states, keeping 0 if API returns an empty array (no data means no PnL)
          setDayPnl(d.length > 0 ? d[0].pnl : 0);
          setWeekPnl(w.length > 0 ? w[0].pnl : 0);
          setMonthPnl(m.length > 0 ? m[0].pnl : 0);
          setAllPnl(a.length > 0 ? a[0].pnl : 0);
        }
      } catch (e) {
        // Catch network/rate limit errors and inform the user
        if (isMounted) {
          showToast({ style: Toast.Style.Failure, title: "Failed to load PnL stats", message: String(e) });
        }
      } finally {
        if (isMounted) setIsLoadingStats(false);
      }
    }
    loadStats();

    return () => {
      isMounted = false;
    };
  }, [address]);

  /**
   * Effect: Fetches the Active Positions (Open Trades).
   * Re-runs whenever the `address`, `searchText`, or `activeOffset` pagination index changes.
   */
  useEffect(() => {
    let isMounted = true;

    async function loadActive() {
      setIsLoadingActive(true);
      try {
        const rawRes = await fetchPositions(address, "CURRENT", "DESC", PAGE_SIZE, activeOffset, searchText);
        if (!isMounted) return;

        // Exclude positions that are already settled (redeemable: true means it's finalized)
        // Also aggressively filter out markets in the "Resolving" phase:
        // - where current price mathematically guaranteed resolution (0 or 1)
        // - where the recorded endDate + 24 hours has already expired natively.
        const now = Date.now();
        const activeOnly = rawRes.filter((pos) => {
          if (pos.redeemable) return false;
          if (pos.curPrice === 0 || pos.curPrice === 1) return false;

          if (pos.endDate) {
            // Polymarket endDates are strings like "2026-03-19" (00:00 UTC).
            // We append 24 hours to cover the entire day.
            const endOfDayUTC = new Date(pos.endDate).getTime() + 86400000;
            if (now > endOfDayUTC) return false;
          }
          return true;
        });

        // If offset is 0, we are replacing the entire array (such as when typing in a new search).
        // Otherwise, we append the results to the existing list ("Load More" logic).
        if (activeOffset === 0) {
          setActivePositions(activeOnly);
        } else {
          setActivePositions((prev) => [...prev, ...activeOnly]);
        }
        // If we get fewer items than requested, we've hit the end of the results limit.
        // We use rawRes instead of activeOnly so we don't prematurely hide "Load More"
        setHasMoreActive(rawRes.length === PAGE_SIZE);
      } catch (e) {
        if (isMounted) {
          showToast({ style: Toast.Style.Failure, title: "Failed to load active positions", message: String(e) });
        }
      } finally {
        if (isMounted) setIsLoadingActive(false);
      }
    }
    loadActive();

    return () => {
      isMounted = false;
    };
  }, [address, searchText, activeOffset]);

  /**
   * Effect: Fetches the Closed Positions (Trade History).
   * Re-runs whenever the `address`, `searchText`, or `closedOffset` pagination index changes.
   */
  useEffect(() => {
    let isMounted = true;

    async function loadClosed() {
      setIsLoadingClosed(true);
      try {
        const res = await fetchClosedPositions(address, "TIMESTAMP", "DESC", PAGE_SIZE, closedOffset, searchText);
        if (!isMounted) return;

        // Uses the same replace-or-append logic as active positions for pagination.
        if (closedOffset === 0) {
          setClosedPositions(res);
        } else {
          setClosedPositions((prev) => [...prev, ...res]);
        }
        setHasMoreClosed(res.length === PAGE_SIZE);
      } catch (e) {
        if (isMounted) {
          showToast({ style: Toast.Style.Failure, title: "Failed to load closed positions", message: String(e) });
        }
      } finally {
        if (isMounted) setIsLoadingClosed(false);
      }
    }
    loadClosed();

    return () => {
      isMounted = false;
    };
  }, [address, searchText, closedOffset]);

  /**
   * Handles user input from the Raycast search bar to filter the currently displayed positions.
   * Modifying the search text intentionally resets both offsets to 0 to fetch the new first page.
   *
   * @param text The new search bar input
   */
  const handleSearchTextChange = (text: string) => {
    setSearchText(text);
    setActiveOffset(0);
    setClosedOffset(0);
  };

  /**
   * Helper function to determine standard color coding based on profitability.
   * Returns Green for positive, Red for negative, and PrimaryText for neutral/loading.
   */
  const getPnlColor = (pnl: number | null) => {
    if (pnl === null) return Color.PrimaryText;
    return pnl >= 0 ? Color.Green : Color.Red;
  };

  return (
    <List
      navigationTitle={`${name}'s Profile Analytics`}
      isLoading={isLoadingStats || isLoadingActive || isLoadingClosed}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Filter positions by title..."
      throttle
    >
      {/* Hide the overview blocks if the user is actively trying to filter positions to save screen real-estate */}
      {!searchText && (
        <List.Section title="PnL Analytics Overview">
          <List.Item
            title="All-Time PnL"
            accessories={[
              {
                text: {
                  value: allPnl !== null ? formatCurrency(allPnl) : "Loading...",
                  color: getPnlColor(allPnl),
                },
              },
            ]}
            icon={Icon.BankNote}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Polymarket Profile"
                  url={`https://polymarket.com/profile/${address}`}
                />
                {profile?.xUsername && (
                  <Action.OpenInBrowser title="Open X (twitter) Profile" url={`https://x.com/${profile.xUsername}`} />
                )}
              </ActionPanel>
            }
          />
          <List.Item
            title="Monthly PnL"
            accessories={[
              {
                text: {
                  value: monthPnl !== null ? formatCurrency(monthPnl) : "Loading...",
                  color: getPnlColor(monthPnl),
                },
              },
            ]}
            icon={Icon.Calendar}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Polymarket Profile"
                  url={`https://polymarket.com/profile/${address}`}
                />
                {profile?.xUsername && (
                  <Action.OpenInBrowser title="Open X (twitter) Profile" url={`https://x.com/${profile.xUsername}`} />
                )}
              </ActionPanel>
            }
          />
          <List.Item
            title="Weekly PnL"
            accessories={[
              {
                text: {
                  value: weekPnl !== null ? formatCurrency(weekPnl) : "Loading...",
                  color: getPnlColor(weekPnl),
                },
              },
            ]}
            icon={Icon.Calendar}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Polymarket Profile"
                  url={`https://polymarket.com/profile/${address}`}
                />
                {profile?.xUsername && (
                  <Action.OpenInBrowser title="Open X (twitter) Profile" url={`https://x.com/${profile.xUsername}`} />
                )}
              </ActionPanel>
            }
          />
          <List.Item
            title="Daily PnL"
            accessories={[
              {
                text: {
                  value: dayPnl !== null ? formatCurrency(dayPnl) : "Loading...",
                  color: getPnlColor(dayPnl),
                },
              },
            ]}
            icon={Icon.Calendar}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Polymarket Profile"
                  url={`https://polymarket.com/profile/${address}`}
                />
                {profile?.xUsername && (
                  <Action.OpenInBrowser title="Open X (twitter) Profile" url={`https://x.com/${profile.xUsername}`} />
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Active Positions" subtitle={`${activePositions.length}`}>
        {activePositions.map((pos, idx) => (
          <List.Item
            key={`active-${pos.asset}-${idx}`}
            title={pos.title}
            subtitle={`Value: ${formatCurrency(pos.currentValue)} • Entry: ${formatCurrency(pos.avgPrice)}`}
            accessories={[
              { text: pos.outcome },
              { text: { value: `PnL: ${formatCurrency(pos.cashPnl)}`, color: getPnlColor(pos.cashPnl) } },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Market" url={getMarketUrl(pos.slug)} />
                <Action.Push
                  icon={Icon.LineChart}
                  title="View Full Market Details"
                  target={<PositionMarketDetailsFetcher pos={pos} />}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action.OpenInBrowser
                  title="Open Polymarket Profile"
                  url={`https://polymarket.com/profile/${address}`}
                />
                {profile?.xUsername && (
                  <Action.OpenInBrowser title="Open X (twitter) Profile" url={`https://x.com/${profile.xUsername}`} />
                )}
                <Action.CopyToClipboard title="Copy Market URL" content={getMarketUrl(pos.slug)} />
              </ActionPanel>
            }
          />
        ))}
        {/* Render a manual 'Load More' item if the API indicated more pages exist */}
        {hasMoreActive && !isLoadingActive && (
          <List.Item
            title="Load More Active Positions..."
            icon={Icon.ChevronDown}
            actions={
              <ActionPanel>
                <Action title="Load More" onAction={() => setActiveOffset((prev) => prev + PAGE_SIZE)} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      <List.Section title="Trade History (Closed)" subtitle={`${closedPositions.length}`}>
        {closedPositions.map((pos, idx) => (
          <List.Item
            key={`closed-${pos.asset}-${idx}`}
            title={pos.title}
            // Timestamp is returned in seconds, so multiply by 1000 for standard JavaScript Date parsing
            subtitle={`Closed: ${new Date(pos.timestamp * 1000).toLocaleDateString("en-US")} • Entry: ${formatCurrency(pos.avgPrice)}`}
            accessories={[
              { text: pos.outcome },
              { text: { value: `PnL: ${formatCurrency(pos.realizedPnl)}`, color: getPnlColor(pos.realizedPnl) } },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Market" url={getMarketUrl(pos.slug)} />
                <Action.Push
                  icon={Icon.LineChart}
                  title="View Full Market Details"
                  target={<PositionMarketDetailsFetcher pos={pos} />}
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                />
                <Action.OpenInBrowser
                  title="Open Polymarket Profile"
                  url={`https://polymarket.com/profile/${address}`}
                />
                {profile?.xUsername && (
                  <Action.OpenInBrowser title="Open X (twitter) Profile" url={`https://x.com/${profile.xUsername}`} />
                )}
                <Action.CopyToClipboard title="Copy Market URL" content={getMarketUrl(pos.slug)} />
              </ActionPanel>
            }
          />
        ))}
        {/* Render a manual 'Load More' item if the API indicated more pages exist */}
        {hasMoreClosed && !isLoadingClosed && (
          <List.Item
            title="Load More Trade History..."
            icon={Icon.ChevronDown}
            actions={
              <ActionPanel>
                <Action title="Load More" onAction={() => setClosedOffset((prev) => prev + PAGE_SIZE)} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
