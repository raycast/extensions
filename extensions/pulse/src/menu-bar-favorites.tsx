import {
  Clipboard,
  Color,
  Icon,
  Image,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  getPreferenceValues,
  launchCommand,
  open,
  openCommandPreferences,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { Favorite, loadFavorites } from "./lib/favorites";
import { formatChange, formatNumber, formatPrice, formatTimestamp } from "./lib/format";
import { RowQuote, fetchRows } from "./lib/quotes";
import { instrumentCurrency, quotePageUrl } from "./lib/symbols";

type TitleStyle = Preferences.MenuBarFavorites["titleStyle"];

/** The first favorite in the menu bar, styled as the person chose. */
function menuBarTitle(
  style: TitleStyle,
  favorite: Favorite | undefined,
  row: RowQuote | undefined,
): string | undefined {
  if (!favorite || style === "icon") return undefined;
  const price = row ? formatNumber(row.price, row.currency ?? instrumentCurrency(favorite)) : "—";
  const arrow =
    row?.changePercent === null || row?.changePercent === undefined ? "" : row.changePercent >= 0 ? "▲" : "▼";
  const change = `${arrow}${formatChange(row?.changePercent).replace(/^[+-]/, "")}`;
  switch (style) {
    case "price":
      return `${favorite.symbol} ${price}`;
    case "full":
      return `${favorite.symbol} ${price} ${change}`;
    default:
      return `${favorite.symbol} ${change}`;
  }
}

function changeIcon(row: RowQuote | undefined): Image.ImageLike {
  if (!row || row.changePercent === null) return { source: Icon.Minus, tintColor: Color.SecondaryText };
  return row.changePercent >= 0
    ? { source: Icon.ArrowUp, tintColor: Color.Green }
    : { source: Icon.ArrowDown, tintColor: Color.Red };
}

const DIGITS: Keyboard.KeyEquivalent[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

async function openSearch() {
  try {
    await launchCommand({ name: "search-symbol", type: LaunchType.UserInitiated });
  } catch (error) {
    await showFailureToast(error, { title: "Could not open Search Symbol" });
  }
}

export default function Command() {
  const { titleStyle } = getPreferenceValues<Preferences.MenuBarFavorites>();
  const { data: favorites, isLoading: favoritesLoading } = useCachedPromise(loadFavorites);
  const symbols = (favorites ?? []).map((favorite) => favorite.symbol);
  const {
    data: priced,
    isLoading: rowsLoading,
    error,
    revalidate,
  } = useCachedPromise(fetchRows, [symbols], {
    execute: symbols.length > 0,
    keepPreviousData: true,
    // The menu bar says what failed in its own menu rather than in a toast.
    onError: () => undefined,
  });
  const rows = priced?.quotes ?? {};
  const lead = favorites?.[0];
  const title = menuBarTitle(titleStyle, lead, lead ? rows[lead.symbol] : undefined);
  const updatedAt = Math.max(0, ...Object.values(rows).map((row) => row.fetchedAt));
  const problem = error?.message ?? (priced?.failed.length ? `${priced.failed.join(" and ")} did not answer.` : null);

  return (
    <MenuBarExtra
      isLoading={favoritesLoading || rowsLoading}
      icon={title ? undefined : { source: Icon.LineChart }}
      title={title}
      tooltip={lead ? `Pulse · ${lead.name}` : "Pulse"}
    >
      {favorites && favorites.length === 0 ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="No favorites yet" />
          <MenuBarExtra.Item title="Add Favorites in Search Symbol…" icon={Icon.Star} onAction={openSearch} />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Section title="Favorites">
          {(favorites ?? []).map((favorite, position) => {
            const row = rows[favorite.symbol];
            const currency = row?.currency ?? instrumentCurrency(favorite);
            return (
              <MenuBarExtra.Item
                key={favorite.symbol}
                icon={changeIcon(row)}
                title={`${favorite.symbol}   ${row ? formatPrice(row.price, currency) : "—"}   ${formatChange(row?.changePercent)}`}
                subtitle={favorite.name === favorite.symbol ? undefined : `  ${favorite.name}`}
                tooltip={`Open ${favorite.symbol} in ${favorite.kind === "crypto" ? "Binance" : "Yahoo Finance"}`}
                shortcut={position < DIGITS.length ? { modifiers: ["cmd"], key: DIGITS[position] } : undefined}
                onAction={() => open(quotePageUrl(favorite.symbol))}
                alternate={
                  <MenuBarExtra.Item
                    icon={Icon.Clipboard}
                    title={`Copy ${favorite.symbol}`}
                    onAction={() => Clipboard.copy(favorite.symbol)}
                  />
                }
              />
            );
          })}
        </MenuBarExtra.Section>
      )}
      {(problem || updatedAt > 0) && (
        <MenuBarExtra.Section>
          {problem && <MenuBarExtra.Item icon={{ source: Icon.Warning, tintColor: Color.Orange }} title={problem} />}
          {updatedAt > 0 && <MenuBarExtra.Item title={`Updated ${formatTimestamp(updatedAt, Date.now())}`} />}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Search Symbol…"
          icon={Icon.MagnifyingGlass}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={openSearch}
        />
        {symbols.length > 0 && (
          <MenuBarExtra.Item
            title="Refresh Prices"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        )}
        <MenuBarExtra.Item title="Configure Menu Bar…" icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
