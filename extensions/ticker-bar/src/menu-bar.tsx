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
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
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

type MenuBarState = {
  ids: string[];
  quotes: Record<string, Quote>;
  statuses: Record<string, QuoteStatus>;
  primary?: string;
  menuBarStyle: MenuBarStyle;
  logoDisplay: LogoDisplay;
};

async function loadMenuBarState(): Promise<MenuBarState> {
  const [ids, quotes, primary, statuses, menuBarStyle, logoDisplay] =
    await Promise.all([
      getWatchlist(),
      getCachedQuotes(),
      getPrimaryAssetId(),
      getQuoteStatuses(),
      getMenuBarStyle(),
      getLogoDisplay(),
    ]);
  return { ids, quotes, primary, statuses, menuBarStyle, logoDisplay };
}

export default function Command(
  props: LaunchProps<{ launchContext?: { renderOnly?: boolean } }>,
) {
  const renderOnly = props.launchContext?.renderOnly === true;
  const backgroundRefresh =
    environment.launchType === LaunchType.Background && !renderOnly;

  const { data, isLoading, mutate } = useCachedPromise(async () => {
    const state = await loadMenuBarState();
    if (!backgroundRefresh) {
      if (Object.keys(state.quotes).length === 0) {
        try {
          await launchCommand({
            name: "refresh-prices",
            type: LaunchType.Background,
          });
        } catch {
          // refresh-prices disabled -- nothing to hydrate with.
        }
      }
      return state;
    }

    try {
      const refreshed = await refreshQuotes(state.ids);
      return { ...state, quotes: refreshed.quotes };
    } catch {
      // A concurrent manual refresh may own the cross-worker refresh lock.
      // Keep rendering the last good cache; the winning worker will repaint.
      return state;
    }
  });

  const watchlist = data?.ids ?? [];
  const quotes = data?.quotes ?? {};
  const statuses = data?.statuses ?? {};
  const primaryAssetId = data?.primary;
  const menuBarStyle = data?.menuBarStyle ?? "primary";
  const logoDisplay = data?.logoDisplay ?? "menu-bar";

  const requestRefresh = async () => {
    try {
      await launchCommand({
        name: "refresh-prices",
        type: LaunchType.Background,
      });
    } catch {
      // refresh-prices disabled; nothing to launch.
    }
  };

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
              onAction={() => updateMenuBarStyle(value, mutate)}
            />
          ))}
          <MenuBarExtra.Item
            title={`Logo: ${logoDisplayLabel(logoDisplay)}`}
            icon={logoDisplay === "menu-bar" ? Icon.Checkmark : Icon.Image}
            onAction={() =>
              updateLogoDisplay(
                logoDisplay === "menu-bar" ? "off" : "menu-bar",
                mutate,
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
  mutate: (update: Promise<MenuBarState>) => Promise<MenuBarState>,
) {
  await mutate(setMenuBarStyle(style).then(() => loadMenuBarState()));
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
  mutate: (update: Promise<MenuBarState>) => Promise<MenuBarState>,
) {
  await mutate(setLogoDisplay(display).then(() => loadMenuBarState()));
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
