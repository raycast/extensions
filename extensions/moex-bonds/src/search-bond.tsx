import { Action, ActionPanel, Color, Icon, List, Toast, showToast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";

import BondDetailView from "./bond-detail";
import { getFavorites, isFavoriteSecid, toggleFavorite } from "./favorites";
import { DASH, fmtPct, fmtSignedPct, fmtUntil } from "./format";
import { fetchQuotes, isYieldMisleading, moexUrl, searchBonds, smartLabUrl } from "./moex";
import { BondRef, FavoriteItem, Quote } from "./types";

const MIN_QUERY = 2;

interface ListRow {
  ref: BondRef;
  quote: Quote | undefined;
}

function favoriteToRef(item: FavoriteItem): BondRef {
  return {
    secid: item.secid,
    shortname: item.shortname,
    isin: null,
    fullname: null,
    emitent: null,
    boardid: item.boardid,
    type: null,
  };
}

export default function Command() {
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
      const quotes = await fetchQuotes(refs, signal);
      return refs.map((ref) => ({ ref, quote: quotes.get(ref.secid) }));
    },
    [query, favorites ?? []],
    { abortable, keepPreviousData: true, initialData: [] },
  );

  const onToggleFavorite = useCallback(
    async (ref: BondRef) => {
      const wasFavorite = isFavoriteSecid(favorites ?? [], ref.secid);
      await toggleFavorite({ secid: ref.secid, shortname: ref.shortname, boardid: ref.boardid });
      reloadFavorites();
      await showToast({
        style: Toast.Style.Success,
        title: wasFavorite ? "Убрано из избранного" : "Добавлено в избранное",
        message: ref.shortname,
      });
    },
    [favorites, reloadFavorites],
  );

  const rows = data ?? [];

  return (
    <List
      isLoading={isLoading}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Название, тикер или ISIN — например «сегежа», «26238», RU000A10CB66"
    >
      {rows.length === 0 ? (
        <EmptyState query={query} error={error} favorites={favorites ?? []} onRetry={revalidate} />
      ) : (
        <List.Section title={searching ? `Найдено: ${rows.length}` : "Избранное"}>
          {rows.map(({ ref, quote }) => (
            <BondListItem
              key={ref.secid}
              bondRef={ref}
              quote={quote}
              starred={isFavoriteSecid(favorites ?? [], ref.secid)}
              onToggleFavorite={() => onToggleFavorite(ref)}
              onFavoritesChange={reloadFavorites}
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
}: {
  query: string;
  error: Error | undefined;
  favorites: FavoriteItem[];
  onRetry: () => void;
}) {
  if (error) {
    return (
      <List.EmptyView
        icon={{ source: Icon.WifiDisabled, tintColor: Color.Red }}
        title="MOEX не отвечает"
        description={error.message}
        actions={
          <ActionPanel>
            <Action title="Повторить" icon={Icon.ArrowClockwise} onAction={onRetry} />
          </ActionPanel>
        }
      />
    );
  }

  if (query.length === 0) {
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={favorites.length === 0 ? "Начните вводить название" : "Избранное пусто"}
        description="Подойдёт часть названия («сегежа»), номер выпуска («26238») или ISIN (RU000A10CB66)."
      />
    );
  }

  if (query.length < MIN_QUERY) {
    return <List.EmptyView icon={Icon.Keyboard} title="Нужно минимум 2 символа" />;
  }

  return (
    <List.EmptyView
      icon={Icon.QuestionMark}
      title="Ничего не нашлось"
      description="Попробуйте тикер, ISIN или имя эмитента. Показываются только торгующиеся выпуски."
    />
  );
}

function BondListItem({
  bondRef,
  quote,
  starred,
  onToggleFavorite,
  onFavoritesChange,
}: {
  bondRef: BondRef;
  quote: Quote | undefined;
  starred: boolean;
  onToggleFavorite: () => void;
  onFavoritesChange: () => void;
}) {
  const moex = moexUrl(bondRef.secid, quote?.boardid ?? bondRef.boardid);
  const smartLab = smartLabUrl(bondRef.secid);

  return (
    <List.Item
      icon={starred ? { source: Icon.Star, tintColor: Color.Yellow } : Icon.Coin}
      title={bondRef.shortname}
      subtitle={bondRef.emitent ?? bondRef.fullname ?? bondRef.secid}
      accessories={buildAccessories(quote)}
      actions={
        <ActionPanel>
          <Action.Push
            title="Открыть карточку"
            icon={Icon.Sidebar}
            target={
              <BondDetailView
                secid={bondRef.secid}
                shortname={bondRef.shortname}
                boardid={bondRef.boardid}
                emitent={bondRef.emitent}
                onFavoritesChange={onFavoritesChange}
              />
            }
          />
          <Action
            title={starred ? "Убрать из избранного" : "В избранное"}
            icon={starred ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            onAction={onToggleFavorite}
          />
          <ActionPanel.Section title="Скопировать">
            {bondRef.isin ? (
              <Action.CopyToClipboard title="ISIN" content={bondRef.isin} shortcut={Keyboard.Shortcut.Common.Copy} />
            ) : null}
            <Action.CopyToClipboard title="Код бумаги" content={bondRef.secid} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Открыть">
            {moex ? <Action.OpenInBrowser title="На MOEX" url={moex} /> : null}
            {smartLab ? <Action.OpenInBrowser title="На Smart-Lab" url={smartLab} /> : null}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function buildAccessories(quote: Quote | undefined): List.Item.Accessory[] {
  if (!quote) return [{ text: DASH }];

  const accessories: List.Item.Accessory[] = [];

  if (isYieldMisleading(quote.durationDays, quote.yieldPct)) {
    // У бумаги с погашением на днях MOEX пересчитывает копейки в годовые и выдаёт 457 %.
    // В списке это читается как ошибка, поэтому показываем то, что реально имеет смысл, — срок.
    const until = fmtUntil(quote.matDate);
    accessories.push({
      text: until ? `гасится ${until}` : "скоро гасится",
      tooltip: `Годовая доходность ${fmtPct(quote.yieldPct, 1)} — на таком горизонте число условное`,
    });
  } else if (quote.yieldPct !== null) {
    accessories.push({ text: `YTM ${fmtPct(quote.yieldPct, 1)}`, tooltip: "Доходность к погашению" });
  }

  if (quote.price.value !== null) {
    const color =
      quote.changePct === null || quote.changePct === 0
        ? Color.SecondaryText
        : quote.changePct > 0
          ? Color.Green
          : Color.Red;
    const change = quote.changePct === null ? "" : ` ${fmtSignedPct(quote.changePct, 1)}`;
    accessories.push({
      tag: { value: `${quote.price.value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} %${change}`, color },
      tooltip: quote.price.label ?? undefined,
    });
  } else {
    accessories.push({ tag: { value: "нет сделок", color: Color.SecondaryText } });
  }

  return accessories;
}
