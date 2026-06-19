import { Grid, ActionPanel, Action, showToast, Toast, Icon, LocalStorage, useNavigation } from "@raycast/api";
import { useState, useMemo, useEffect, useRef } from "react";
import { useLocalStorage } from "@raycast/utils";
import {
  Card,
  ScryfallSearchResponse,
  SortOrder,
  SAVED_CARDS_KEY,
  getCardImageUri,
  isFlippable,
  sortCards,
} from "./shared";
import { CardDetailView, CardActions } from "./card-views";
import Command from "./search-view";
import { pauseCoverFetch, resumeCoverFetch } from "./cover-fetcher";
import { COLLECTION_IDS_KEY, COLLECTION_NAMES_KEY } from "./collection";

// ─── Cache helpers ────────────────────────────────────────────────────────────

function cacheKey(setCode: string) {
  return `setCards_${setCode}`;
}

async function loadCachedCards(setCode: string): Promise<Card[] | null> {
  try {
    const raw = await LocalStorage.getItem<string>(cacheKey(setCode));
    if (!raw) return null;
    return JSON.parse(raw) as Card[];
  } catch {
    return null;
  }
}

async function saveCardCache(setCode: string, cards: Card[]): Promise<void> {
  try {
    await LocalStorage.setItem(cacheKey(setCode), JSON.stringify(cards));
  } catch {
    // Storage full or serialization error — silently skip
  }
}

function isReleased(releasedAt: string): boolean {
  return releasedAt <= new Date().toISOString().slice(0, 10);
}

// ─── Fetch with retry on 429 ──────────────────────────────────────────────────

type FetchResult = { type: "ok"; response: Response } | { type: "inactive" } | { type: "rate_limited" };

async function fetchWithRetry(url: string, active: () => boolean): Promise<FetchResult> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.status !== 429) return { type: "ok", response: res };
    if (!active()) return { type: "inactive" };
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "2", 10);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Rate limited by Scryfall",
      message: `Retrying in ${retryAfter}s… (attempt ${attempt + 1}/4)`,
    });
    await new Promise<void>((r) => setTimeout(r, retryAfter * 1000));
    toast.hide();
    if (!active()) return { type: "inactive" };
  }
  return { type: "rate_limited" };
}

// ─── Set Cards View ───────────────────────────────────────────────────────────

export function SetCardsView({
  setCode,
  setName,
  releasedAt,
}: {
  setCode: string;
  setName: string;
  releasedAt: string;
}) {
  const { push } = useNavigation();
  const mounted = useRef(false);

  // Pause synchronously on first mount — before any fetches fire.
  // useRef guard prevents Strict Mode's fake unmount/remount from resuming mid-view.
  if (!mounted.current) {
    mounted.current = true;
    pauseCoverFetch();
  }

  useEffect(() => {
    return () => {
      resumeCoverFetch();
    };
  }, []);

  const [filterText, setFilterText] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [order, setOrder] = useState<SortOrder>("usd");
  const [fetchedCards, setFetchedCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCards, setTotalCards] = useState<number | undefined>();
  const [rateLimited, setRateLimited] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  function toggleFlip(id: string) {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const { value: savedCards, setValue: setSavedCards } = useLocalStorage<Card[]>(SAVED_CARDS_KEY, []);
  const savedCardIds = useMemo(() => new Set((savedCards ?? []).map((c) => c.id)), [savedCards]);
  const { value: collectionIds } = useLocalStorage<string[]>(COLLECTION_IDS_KEY, []);
  const { value: collectionNames } = useLocalStorage<string[]>(COLLECTION_NAMES_KEY, []);
  const collectionIdSet = useMemo(() => new Set(collectionIds ?? []), [collectionIds]);
  const collectionNameSet = useMemo(() => new Set(collectionNames ?? []), [collectionNames]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedFilter(filterText), 200);
    return () => clearTimeout(timer);
  }, [filterText]);

  const query = debouncedFilter.trim() ? `e:${setCode} ${debouncedFilter.trim()}` : `e:${setCode}`;
  const queryRef = useRef(query);
  const released = isReleased(releasedAt);

  useEffect(() => {
    queryRef.current = query;
    setFetchedCards([]);
    setTotalCards(undefined);
    setIsLoading(true);
    setRateLimited(false);

    let active = true;
    const isActive = () => active;
    const isBaseQuery = !debouncedFilter.trim();

    async function fetchAll() {
      // Serve from cache for released sets when no filter is applied
      if (released && isBaseQuery) {
        const cached = await loadCachedCards(setCode);
        if (cached && cached.length > 0 && active) {
          console.log(`[SetCardsView] cache hit — ${setCode}: ${cached.length} cards`);
          setFetchedCards(cached);
          setTotalCards(cached.length);
          setIsLoading(false);
          return;
        }
      }

      const baseUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=usd&dir=desc&unique=prints`;
      console.log(`[SetCardsView] fetching — set: ${setCode}, released: ${released}`);

      let page1: ScryfallSearchResponse;
      try {
        const result = await fetchWithRetry(baseUrl, isActive);
        if (result.type === "inactive") return;
        if (result.type === "rate_limited") {
          if (active) {
            setIsLoading(false);
            setRateLimited(true);
          }
          return;
        }
        const res = result.response;
        if (!res.ok) {
          console.log(`[SetCardsView] page 1 error ${res.status}`);
          await showToast({ style: Toast.Style.Failure, title: "Failed to load set", message: `${res.status}` });
          if (active) setIsLoading(false);
          return;
        }
        page1 = (await res.json()) as ScryfallSearchResponse;
        console.log(
          `[SetCardsView] page 1 — ${page1.data.length}/${page1.total_cards} cards, has_more: ${page1.has_more}`
        );
      } catch (e) {
        console.log(`[SetCardsView] page 1 fetch error: ${(e as Error).message}`);
        if (active) setIsLoading(false);
        return;
      }

      if (!active) return;
      setTotalCards(page1.total_cards);
      setFetchedCards(page1.data);

      if (!page1.has_more) {
        if (released && isBaseQuery) await saveCardCache(setCode, page1.data);
        setIsLoading(false);
        return;
      }

      const PAGE_SIZE = 175;
      const totalPages = Math.ceil(page1.total_cards / PAGE_SIZE);
      const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
      console.log(`[SetCardsView] fetching ${remainingPages.length} more pages in parallel`);

      const results = await Promise.all(
        remainingPages.map(async (page) => {
          try {
            const result = await fetchWithRetry(`${baseUrl}&page=${page}`, isActive);
            if (result.type !== "ok") return [];
            if (!result.response.ok) {
              console.log(`[SetCardsView] page ${page} error ${result.response.status}`);
              return [];
            }
            const json = (await result.response.json()) as ScryfallSearchResponse;
            console.log(`[SetCardsView] page ${page} — ${json.data.length} cards`);
            return json.data;
          } catch (e) {
            console.log(`[SetCardsView] page ${page} error: ${(e as Error).message}`);
            return [];
          }
        })
      );

      if (!active) return;

      const all = [...page1.data, ...results.flat()];
      console.log(`[SetCardsView] done — ${all.length} total cards`);
      setFetchedCards(all);
      if (released && isBaseQuery) await saveCardCache(setCode, all);
      setIsLoading(false);
    }

    fetchAll();
    return () => {
      active = false;
    };
  }, [query, retryCount]);

  const cards = useMemo(() => sortCards(fetchedCards, order), [fetchedCards, order]);

  function toggleSave(card: Card) {
    if (savedCardIds.has(card.id)) {
      setSavedCards((savedCards ?? []).filter((c) => c.id !== card.id));
      showToast({ style: Toast.Style.Success, title: "Removed from Saved" });
    } else {
      setSavedCards([...(savedCards ?? []), card]);
      showToast({ style: Toast.Style.Success, title: "Card Bookmarked" });
    }
  }

  const hasResults = cards.length > 0;
  const isSearching = isLoading && !hasResults;
  const loadingMore = isLoading && hasResults;

  return (
    <Grid
      columns={3}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      searchText={filterText}
      onSearchTextChange={setFilterText}
      searchBarPlaceholder={`Filter ${setName} — try a card name or Scryfall syntax`}
      navigationTitle={setName}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Sort Order" value={order} onChange={(v) => setOrder(v as SortOrder)}>
          <Grid.Dropdown.Item title="Price (High → Low)" value="usd" />
          <Grid.Dropdown.Item title="Name (A → Z)" value="name" />
          <Grid.Dropdown.Item title="EDHRec Rank (High → Low)" value="edhrec" />
        </Grid.Dropdown>
      }
    >
      {isSearching ? (
        <Grid.EmptyView icon="🧙" title="Loading…" description={`Fetching cards from ${setName}`} />
      ) : rateLimited ? (
        <Grid.EmptyView
          icon="⏱️"
          title="Rate Limited by Scryfall"
          description="Too many requests. Wait a moment and try again."
          actions={
            <ActionPanel>
              <Action
                title="Retry"
                icon={Icon.ArrowClockwise}
                onAction={() => {
                  setRateLimited(false);
                  setRetryCount((n) => n + 1);
                }}
              />
            </ActionPanel>
          }
        />
      ) : !hasResults ? (
        <Grid.EmptyView
          icon="🧙"
          title="No Cards Found"
          description={
            filterText.trim() ? `No cards in ${setName} match "${filterText}".` : `No cards found in ${setName}.`
          }
        />
      ) : (
        <Grid.Section
          title={
            loadingMore
              ? `Loading… ${cards.length}${totalCards ? ` of ${totalCards.toLocaleString()}` : ""} cards`
              : `${cards.length.toLocaleString()} card${cards.length !== 1 ? "s" : ""}`
          }
        >
          {cards.map((card) => {
            const isDFC = isFlippable(card);
            const faceIndex = isDFC && flippedCards.has(card.id) ? 1 : 0;
            const activeFace = isDFC ? card.card_faces![faceIndex] : null;
            const imageUri = activeFace?.image_uris?.png ?? getCardImageUri(card);
            const isSaved = savedCardIds.has(card.id);
            const exactMatch = collectionIdSet.has(card.id);
            const nameMatch = !exactMatch && collectionNameSet.has(card.name);
            const price = card.prices?.usd ? `$${card.prices.usd}` : undefined;

            return (
              <Grid.Item
                key={card.id}
                content={{ source: imageUri }}
                title={`${isSaved ? "🔖 " : ""}${exactMatch ? "✅ " : nameMatch ? "☑️ " : ""}${card.name}`}
                subtitle={price}
                actions={
                  <CardActions
                    card={card}
                    imageUri={imageUri}
                    searchTagTarget={(query) => <Command initialSearch={query} />}
                    isDFC={isDFC}
                    faceIndex={faceIndex}
                    onFlip={() => toggleFlip(card.id)}
                    onShowDetails={() =>
                      push(
                        <CardDetailView card={card} searchTagTarget={(query) => <Command initialSearch={query} />} />
                      )
                    }
                    isSaved={isSaved}
                    onToggleSave={toggleSave}
                  />
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
