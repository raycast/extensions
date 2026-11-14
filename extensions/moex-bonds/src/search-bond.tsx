import { Action, ActionPanel, Color, Icon, Keyboard, List, Toast, showToast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";

import BondDetailView from "./bond-detail";
import { getFavorites, isFavoriteSecid, toggleFavorite } from "./favorites";
import { DASH, Formatter } from "./format";
import { fetchQuotes, isYieldMisleading, moexUrl, searchBonds, smartLabUrl } from "./moex";
import { useLocale } from "./preferences";
import { Strings, describeError, priceLabel } from "./strings";
import { BondRef, FavoriteItem, Quote } from "./types";

const MIN_QUERY = 2;

interface ListRow {
  ref: BondRef;
  quote: Quote | undefined;
  /** Котировка не пришла из-за ошибки запроса, а не из-за отсутствия сделок. */
  failed: boolean;
}

function favoriteToRef(item: FavoriteItem): BondRef {
  return {
    secid: item.secid,
    shortname: item.shortname,
    isin: item.isin,
    fullname: null,
    emitent: null,
    boardid: item.boardid,
    type: null,
  };
}

export default function Command() {
  const { fmt, t } = useLocale();
  const [searchText, setSearchText] = useState("");
  const abortable = useRef<AbortController>(null);

  const { data: favorites, revalidate: reloadFavorites } = useCachedPromise(getFavorites, [], { initialData: [] });

  const query = searchText.trim();
  const searching = query.length >= MIN_QUERY;

  const { data, isLoading, error, revalidate } = useCachedPromise(
    async (q: string, favs: FavoriteItem[]): Promise<ListRow[]> => {
      const signal = abortable.current?.signal;
      const refs = q.length >= MIN_QUERY ? await searchBonds(q, signal) : favs.map(favoriteToRef);
      if (refs.length === 0) return [];
      const { quotes, failed } = await fetchQuotes(refs, signal);
      return refs.map((ref) => ({ ref, quote: quotes.get(ref.secid), failed: failed.has(ref.secid) }));
    },
    [query, favorites ?? []],
    { abortable, keepPreviousData: true, initialData: [] },
  );

  const onToggleFavorite = useCallback(
    async (ref: BondRef) => {
      const wasFavorite = isFavoriteSecid(favorites ?? [], ref.secid);
      await toggleFavorite({ secid: ref.secid, shortname: ref.shortname, boardid: ref.boardid, isin: ref.isin });
      reloadFavorites();
      await showToast({
        style: Toast.Style.Success,
        title: wasFavorite ? t.removedFromFavorites : t.addedToFavorites,
        message: ref.shortname,
      });
    },
    [favorites, reloadFavorites, t],
  );

  const rows = data ?? [];

  return (
    <List
      isLoading={isLoading}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={t.searchPlaceholder}
    >
      {rows.length === 0 ? (
        <EmptyState query={query} error={error} favorites={favorites ?? []} onRetry={revalidate} t={t} />
      ) : (
        <List.Section title={searching ? t.found(rows.length) : t.favorites}>
          {rows.map(({ ref, quote, failed }) => (
            <BondListItem
              key={ref.secid}
              bondRef={ref}
              quote={quote}
              failed={failed}
              starred={isFavoriteSecid(favorites ?? [], ref.secid)}
              onToggleFavorite={() => onToggleFavorite(ref)}
              onFavoritesChange={reloadFavorites}
              onRefresh={revalidate}
              fmt={fmt}
              t={t}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function EmptyState({
  query,
  error,
  favorites,
  onRetry,
  t,
}: {
  query: string;
  error: Error | undefined;
  favorites: FavoriteItem[];
  onRetry: () => void;
  t: Strings;
}) {
  if (error) {
    return (
      <List.EmptyView
        icon={{ source: Icon.WifiDisabled, tintColor: Color.Red }}
        title={t.emptyOffline}
        description={describeError(error, t)}
        actions={
          <ActionPanel>
            <Action title={t.retry} icon={Icon.ArrowClockwise} onAction={onRetry} />
          </ActionPanel>
        }
      />
    );
  }

  if (query.length === 0) {
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={favorites.length === 0 ? t.emptyStartTitle : t.emptyFavoritesTitle}
        description={t.emptyStartHint}
      />
    );
  }

  if (query.length < MIN_QUERY) {
    return <List.EmptyView icon={Icon.Keyboard} title={t.emptyTooShort} />;
  }

  return <List.EmptyView icon={Icon.QuestionMark} title={t.emptyNotFound} description={t.emptyNotFoundHint} />;
}

function BondListItem({
  bondRef,
  quote,
  failed,
  starred,
  onToggleFavorite,
  onFavoritesChange,
  onRefresh,
  fmt,
  t,
}: {
  bondRef: BondRef;
  quote: Quote | undefined;
  failed: boolean;
  starred: boolean;
  onToggleFavorite: () => void;
  onFavoritesChange: () => void;
  onRefresh: () => void;
  fmt: Formatter;
  t: Strings;
}) {
  const moex = moexUrl(bondRef.secid, quote?.boardid ?? bondRef.boardid);
  const smartLab = smartLabUrl(bondRef.secid);

  return (
    <List.Item
      icon={starred ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Coin}
      title={bondRef.shortname}
      subtitle={bondRef.emitent ?? bondRef.fullname ?? bondRef.secid}
      accessories={buildAccessories(quote, failed, fmt, t)}
      actions={
        <ActionPanel>
          <Action.Push
            title={t.openCard}
            icon={Icon.Sidebar}
            target={
              <BondDetailView
                secid={bondRef.secid}
                shortname={bondRef.shortname}
                boardid={bondRef.boardid}
                isin={bondRef.isin}
                emitent={bondRef.emitent}
                onFavoritesChange={onFavoritesChange}
              />
            }
          />
          <Action
            title={starred ? t.removeFromFavorites : t.addToFavorites}
            icon={starred ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={onToggleFavorite}
          />
          <Action
            title={t.refreshQuotes}
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
          <ActionPanel.Section title={t.copySection}>
            {bondRef.isin ? (
              <Action.CopyToClipboard title="ISIN" content={bondRef.isin} shortcut={Keyboard.Shortcut.Common.Copy} />
            ) : null}
            <Action.CopyToClipboard title={t.copySecid} content={bondRef.secid} />
          </ActionPanel.Section>
          <ActionPanel.Section title={t.openSection}>
            {moex ? <Action.OpenInBrowser title={t.openOnMoex} url={moex} /> : null}
            {smartLab ? <Action.OpenInBrowser title={t.openOnSmartLab} url={smartLab} /> : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildAccessories(
  quote: Quote | undefined,
  failed: boolean,
  fmt: Formatter,
  t: Strings,
): List.Item.Accessory[] {
  if (failed) {
    // Отличаем «запрос не дошёл» от «по бумаге нет сделок»: прочерк на месте обеих
    // ситуаций выдаёт недоступный MOEX за пустые данные.
    return [
      {
        tag: { value: t.noQuoteData, color: Color.Orange },
        icon: { source: Icon.ExclamationMark, tintColor: Color.Orange },
        tooltip: t.noQuoteDataTooltip,
      },
    ];
  }
  if (!quote) return [{ text: DASH }];

  const accessories: List.Item.Accessory[] = [];

  if (isYieldMisleading(quote.durationDays, quote.yieldPct)) {
    // У бумаги с погашением на днях MOEX пересчитывает копейки в годовые и выдаёт 457 %.
    // В списке это читается как ошибка, поэтому показываем то, что реально имеет смысл, — срок.
    const until = fmt.until(quote.matDate);
    accessories.push({
      text: until ? t.maturesIn(until) : t.maturesSoon,
      tooltip: t.misleadingYieldTooltip(fmt.pct(quote.yieldPct, 1)),
    });
  } else if (quote.yieldPct !== null) {
    accessories.push({ text: `${t.ytm} ${fmt.pct(quote.yieldPct, 1)}`, tooltip: t.ytmTooltip });
  }

  if (quote.price.value !== null) {
    const color =
      quote.changePct === null || quote.changePct === 0
        ? Color.SecondaryText
        : quote.changePct > 0
          ? Color.Green
          : Color.Red;
    const change = quote.changePct === null ? "" : ` ${fmt.signedPct(quote.changePct, 1)}`;
    accessories.push({
      tag: { value: `${fmt.loose(quote.price.value, 2)}${fmt.language === "ru" ? " %" : "%"}${change}`, color },
      tooltip: priceLabel(quote.price, fmt, t) ?? undefined,
    });
  } else {
    accessories.push({ tag: { value: t.noTrades, color: Color.SecondaryText } });
  }

  return accessories;
}
