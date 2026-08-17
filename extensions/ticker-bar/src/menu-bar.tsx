import {
  Color,
  environment,
  Icon,
  LaunchProps,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { marketLogo } from "./market-logo";
import {
  Quote,
  QuoteStatus,
  LogoDisplay,
  MenuBarStyle,
  assetFromId,
  formatMenuTitle,
  formatPercent,
  getCachedQuotes,
  getLogoDisplay,
  getMenuBarStyle,
  getPrimaryAssetId,
  getQuoteStatuses,
  getWatchlist,
  refreshQuotes,
  setLogoDisplay,
  setMenuBarStyle,
} from "./market";
import { formatAge, quoteFreshness, truncateText } from "./market-format";

export default function Command(
  props: LaunchProps<{ launchContext?: { renderOnly?: boolean } }>,
) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [statuses, setStatuses] = useState<Record<string, QuoteStatus>>({});
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [primaryAssetId, setPrimaryAssetId] = useState<string>();
  const [menuBarStyle, setMenuBarStyleValue] =
    useState<MenuBarStyle>("primary");
  const [logoDisplay, setLogoDisplayValue] = useState<LogoDisplay>("menu-bar");
  const [isLoading, setIsLoading] = useState(true);

  // Read the cached watchlist/quotes/primary into state. Cheap (LocalStorage
  // only), so it is safe in any render -- including a user-opened menu, where
  // clicking an item closes the menu and force-unloads the worker.
  const hydrateState = useCallback(async () => {
    const [ids, cached, primary, quoteStatuses, displayStyle, logoPreference] =
      await Promise.all([
        getWatchlist(),
        getCachedQuotes(),
        getPrimaryAssetId(),
        getQuoteStatuses(),
        getMenuBarStyle(),
        getLogoDisplay(),
      ]);
    setWatchlist(ids);
    setPrimaryAssetId(primary);
    setQuotes(cached);
    setStatuses(quoteStatuses);
    setMenuBarStyleValue(displayStyle);
    setLogoDisplayValue(logoPreference);
    return { ids, cached };
  }, []);

  // Cache-only render: user opened the menu, or another command already
  // refreshed the cache and just wants a repaint (renderOnly bounce).
  const loadFromCache = useCallback(async () => {
    const { cached } = await hydrateState();
    // Cold cache on first run: kick the refresher to hydrate it. Awaited inside
    // isLoading so the launch IPC cannot outlive the worker.
    if (Object.keys(cached).length === 0) {
      try {
        await launchCommand({
          name: "refresh-prices",
          type: LaunchType.Background,
        });
      } catch {
        // refresh-prices disabled -- nothing to hydrate with.
      }
    }
    setIsLoading(false);
  }, [hydrateState]);

  // Background-only refresh: the 1-minute scheduled interval (the only timer
  // Raycast actually schedules for this extension) and refreshMenuBar() bounces
  // after a watchlist edit. Safe to fetch here -- no open menu to close out
  // from under the worker -- as long as isLoading stays true for the whole
  // fetch so Raycast keeps the worker alive until the cache write lands.
  const loadAndRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const { ids } = await hydrateState();
      const refreshed = await refreshQuotes(ids);
      setQuotes(refreshed.quotes);
    } catch {
      // A concurrent manual refresh may own the cross-worker refresh lock.
      // Keep rendering the last good cache; the winning worker will repaint.
    } finally {
      setIsLoading(false);
    }
  }, [hydrateState]);

  useEffect(() => {
    // Fetch only on background renders. Opening the menu is UserInitiated, and a
    // subsequent click closes the menu and force-unloads the worker -- an
    // in-flight fetch there is what threw "Error: Worker unloaded". A renderOnly
    // bounce (from refresh-prices, which already fetched) just repaints.
    const renderOnly = props.launchContext?.renderOnly === true;
    if (environment.launchType === LaunchType.Background && !renderOnly) {
      loadAndRefresh();
    } else {
      loadFromCache();
    }
  }, [loadAndRefresh, loadFromCache, props.launchContext?.renderOnly]);

  // Manual refresh: hand the slow work to refresh-prices (its own session, which
  // unlike the menu-bar worker has a real execution budget) and only hold this
  // worker alive (isLoading) for the brief Background launch IPC. Background
  // avoids the foreground openRaycastCommand handshake that times out for a
  // no-view command launched from a menu-bar popover.
  const requestRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await launchCommand({
        name: "refresh-prices",
        type: LaunchType.Background,
      });
    } catch {
      // refresh-prices disabled; nothing to launch.
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolvedPrimaryId = primaryAssetId ?? watchlist[0];
  const primaryQuote = quotes[resolvedPrimaryId] ?? quotes[watchlist[0]];
  const secondaryWatchlist = watchlist.filter((id) => id !== resolvedPrimaryId);
  const title = useMemo(
    () => formatMenuTitle(primaryQuote, menuBarStyle),
    [menuBarStyle, primaryQuote],
  );
  const menuBarIcon =
    logoDisplay === "menu-bar"
      ? (marketLogo(primaryQuote, title ? undefined : Icon.LineChart) ??
        (title ? undefined : Icon.LineChart))
      : title
        ? undefined
        : Icon.LineChart;
  return (
    <MenuBarExtra
      icon={menuBarIcon}
      title={title}
      tooltip={tooltipFor(primaryQuote)}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title="Ticker Bar">
        {primaryQuote ? (
          <MenuBarExtra.Item
            title={titleFor(primaryQuote)}
            subtitle={compactSubtitleFor(primaryQuote)}
            tooltip={tooltipFor(primaryQuote)}
            icon={iconFor(primaryQuote)}
            onAction={() => openQuote(primaryQuote)}
          />
        ) : (
          <MenuBarExtra.Item
            title="No cached quote yet"
            subtitle="Refresh once to hydrate Ticker Bar"
            icon={Icon.Clock}
          />
        )}
      </MenuBarExtra.Section>

      {secondaryWatchlist.length ? (
        <MenuBarExtra.Section title="Watchlist">
          {secondaryWatchlist.map((id) => {
            const quote = quotes[id];
            if (!quote) {
              const asset = assetFromId(id);
              const status = statuses[id];
              return (
                <MenuBarExtra.Item
                  key={id}
                  title={`${asset?.symbol ?? id} —`}
                  tooltip={status?.error ?? "Quote unavailable"}
                  icon={{ source: Icon.Warning, tintColor: Color.Orange }}
                />
              );
            }
            return (
              <MenuBarExtra.Item
                key={id}
                title={titleFor(quote)}
                subtitle={compactSubtitleFor(quote)}
                tooltip={tooltipFor(quote)}
                icon={iconFor(quote)}
                onAction={() => openQuote(quote)}
              />
            );
          })}
        </MenuBarExtra.Section>
      ) : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Update Market Data"
          icon={Icon.ArrowClockwise}
          onAction={requestRefresh}
        />
        <MenuBarExtra.Item
          title="Browse Markets"
          icon={Icon.MagnifyingGlass}
          onAction={() =>
            launchCommand({
              name: "search-market",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Manage Watchlist"
          icon={Icon.List}
          onAction={() =>
            launchCommand({
              name: "manage-watchlist",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Advanced Watchlist Editor"
          icon={Icon.Gear}
          onAction={() =>
            launchCommand({
              name: "configure-ticker-bar",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Submenu
          title={`Menu Bar: ${menuBarStyleLabel(menuBarStyle)}`}
          icon={Icon.Eye}
        >
          {MENU_BAR_STYLES.map(({ value, label }) => (
            <MenuBarExtra.Item
              key={value}
              title={label}
              icon={value === menuBarStyle ? Icon.Checkmark : undefined}
              onAction={() => updateMenuBarStyle(value, setMenuBarStyleValue)}
            />
          ))}
          <MenuBarExtra.Item
            title={`Logo: ${logoDisplayLabel(logoDisplay)}`}
            icon={logoDisplay === "menu-bar" ? Icon.Checkmark : Icon.Image}
            onAction={() =>
              updateLogoDisplay(
                logoDisplay === "menu-bar" ? "off" : "menu-bar",
                setLogoDisplayValue,
              )
            }
          />
        </MenuBarExtra.Submenu>
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

const MENU_BAR_STYLES: { value: MenuBarStyle; label: string }[] = [
  { value: "primary", label: "Primary Ticker" },
  { value: "primary-change", label: "Primary Ticker and Change" },
];

function menuBarStyleLabel(style: MenuBarStyle) {
  return (
    MENU_BAR_STYLES.find((option) => option.value === style)?.label ??
    "Primary Ticker"
  );
}

async function updateMenuBarStyle(
  style: MenuBarStyle,
  updateState: (style: MenuBarStyle) => void,
) {
  await setMenuBarStyle(style);
  updateState(style);
}

function logoDisplayLabel(display: LogoDisplay) {
  switch (display) {
    case "menu-bar":
      return "On";
    case "off":
      return "Off";
    default: {
      const exhaustive: never = display;
      return exhaustive;
    }
  }
}

async function updateLogoDisplay(
  display: LogoDisplay,
  updateState: (display: LogoDisplay) => void,
) {
  await setLogoDisplay(display);
  updateState(display);
}

function titleFor(quote: Quote) {
  if (quote.kind === "polymarket") {
    const question = quote.name?.trim();
    return question && question.length > 0
      ? truncateText(question, 38)
      : `${quote.symbol} ${quote.priceLabel}`;
  }
  return `${quote.symbol} ${quote.priceLabel}`;
}

function compactSubtitleFor(quote: Quote) {
  const change =
    typeof quote.changePercent === "number"
      ? formatPercent(quote.changePercent)
      : undefined;
  if (quote.kind === "polymarket")
    return `${quote.symbol} ${quote.priceLabel}${change ? ` ${change}` : ""}`;
  return change;
}

function tooltipFor(quote: Quote | undefined) {
  if (!quote) return "Ticker Bar";
  const age = formatAge(quote.lastSuccessAt ?? quote.asOf);
  return quote.error
    ? `${quote.name} · ${quote.provider} · Stale: ${quote.error}`
    : `${quote.name} · ${quote.provider} · Updated ${age}`;
}

function iconFor(quote: Quote) {
  if (quoteFreshness(quote) === "stale") {
    return { source: Icon.Warning, tintColor: Color.Orange };
  }
  return directionIconFor(quote);
}

function directionIconFor(quote: Quote) {
  if (typeof quote.changePercent !== "number" || quote.changePercent === 0) {
    return { source: Icon.Minus, tintColor: Color.SecondaryText };
  }
  return quote.changePercent > 0
    ? { source: Icon.ChevronUp, tintColor: Color.Green }
    : { source: Icon.ChevronDown, tintColor: Color.Red };
}

async function openQuote(quote: Quote) {
  if (quote.url) await open(quote.url);
}
