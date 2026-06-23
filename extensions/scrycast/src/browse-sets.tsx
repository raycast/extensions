import { Grid, ActionPanel, Action, Color, Icon, useNavigation } from "@raycast/api";
import { useFetch, useLocalStorage } from "@raycast/utils";
import { useState, useMemo, useEffect, useRef } from "react";
import { getCardImageUri, type Card, type ScryfallSearchResponse, FEEDBACK_URL } from "./shared";
import { CardDetailView } from "./card-views";
import Command from "./search-view";
import { SetCardsView } from "./set-cards-view";
import { startCoverFetch, resetFetchedCodes, updateCoverCallbacks } from "./cover-fetcher";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScryfallSet {
  id: string;
  code: string;
  name: string;
  set_type: string;
  released_at?: string;
  icon_svg_uri: string;
  card_count: number;
}

interface ScryfallSetsResponse {
  object: string;
  data: ScryfallSet[];
  has_more: boolean;
}

type SetFilter = "all" | "main" | "arena" | "other";

// ─── Constants ────────────────────────────────────────────────────────────────

const EXCLUDED_SET_TYPES = new Set(["token", "memorabilia", "minigame", "treasure_chest", "vanguard"]);
const MAIN_SET_TYPES = new Set(["core", "expansion", "masters", "draft_innovation"]);
const ARENA_SET_TYPES = new Set(["alchemy", "spellbook"]);
const SET_TOP_CARDS_KEY = "setTopCards";

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchMostExpensiveCard(code: string): Promise<Card | undefined> {
  const res = await fetch(
    `https://api.scryfall.com/cards/search?q=e:${encodeURIComponent(code)}&order=usd&dir=desc&unique=prints`
  );
  if (!res.ok) return undefined;
  const json = (await res.json()) as ScryfallSearchResponse;
  return json.data[0];
}

function matchesFilter(set: ScryfallSet, filter: SetFilter): boolean {
  if (filter === "main") return MAIN_SET_TYPES.has(set.set_type);
  if (filter === "arena") return ARENA_SET_TYPES.has(set.set_type);
  if (filter === "other") return !MAIN_SET_TYPES.has(set.set_type) && !ARENA_SET_TYPES.has(set.set_type);
  return true;
}

// ─── Set Grid Item ────────────────────────────────────────────────────────────

interface SetGridItemProps {
  set: ScryfallSet;
  topCard?: Card;
  onCardFetched: (code: string, card: Card) => void;
  onCardCleared: (code: string) => void;
  onAllCleared: () => void;
}

function SetGridItem({ set, topCard, onCardFetched, onCardCleared, onAllCleared }: SetGridItemProps) {
  const { push } = useNavigation();

  const content = topCard
    ? { source: getCardImageUri(topCard) }
    : { source: set.icon_svg_uri, tintColor: Color.SecondaryText };

  function browseSet() {
    push(<SetCardsView setCode={set.code} setName={set.name} releasedAt={set.released_at ?? ""} />);
    if (!topCard) {
      fetchMostExpensiveCard(set.code)
        .then((card) => {
          if (card) onCardFetched(set.code, card);
        })
        .catch(() => {
          /* ignore */
        });
    }
  }

  async function refreshCard() {
    onCardCleared(set.code);
    try {
      const card = await fetchMostExpensiveCard(set.code);
      if (card) onCardFetched(set.code, card);
    } catch {
      /* ignore */
    }
  }

  return (
    <Grid.Item
      content={content}
      title={set.name}
      subtitle={`${set.code.toUpperCase()} (${set.card_count} cards)`}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={set.name}>
            <Action title="Browse Set" icon={Icon.MagnifyingGlass} onAction={browseSet} />
            {topCard && (
              <Action.Push
                title="Show Top Card Details"
                icon={Icon.Eye}
                shortcut={{ modifiers: ["cmd"], key: "return" }}
                target={
                  <CardDetailView card={topCard} searchTagTarget={(query) => <Command initialSearch={query} />} />
                }
              />
            )}
            <Action
              title="Refresh Cached Card"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={refreshCard}
            />
            <Action
              title="Clear All Cached Cards"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              onAction={onAllCleared}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Feedback">
            <Action.OpenInBrowser title="Submit Bug or Feature Request" url={FEEDBACK_URL} icon={Icon.Bug} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

// ─── Browse Sets Command ──────────────────────────────────────────────────────

export default function BrowseSets() {
  const [searchText, setSearchText] = useState("");
  const [setFilter, setSetFilter] = useState<SetFilter>("main");
  const { value: persistedCards, setValue: setPersistedCards } = useLocalStorage<Record<string, Card>>(
    SET_TOP_CARDS_KEY,
    {}
  );
  const [liveCards, setLiveCards] = useState<Record<string, Card>>({});
  const [fetchTrigger, setFetchTrigger] = useState(0);

  // Merged view: persisted wins (confirmed good data)
  const topCards = useMemo(() => ({ ...liveCards, ...(persistedCards ?? {}) }), [liveCards, persistedCards]);

  const { isLoading, data } = useFetch<ScryfallSetsResponse>("https://api.scryfall.com/sets", {
    keepPreviousData: true,
  });

  const allSets = useMemo(() => {
    return (data?.data ?? [])
      .filter((s) => !EXCLUDED_SET_TYPES.has(s.set_type) && s.released_at && s.card_count > 0)
      .sort((a, b) => (b.released_at ?? "").localeCompare(a.released_at ?? ""));
  }, [data]);

  const filteredSets = useMemo(() => {
    const sets = allSets.filter((s) => matchesFilter(s, setFilter));
    if (!searchText.trim()) return sets;
    const q = searchText.toLowerCase();
    return sets.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [allSets, searchText, setFilter]);

  // Keep a stable ref to persistedCards so onCard always merges into the latest snapshot.
  // Initialize to undefined so the fetch effect knows when storage has actually loaded.
  const persistedCardsRef = useRef<Record<string, Card> | undefined>(undefined);
  useEffect(() => {
    persistedCardsRef.current = persistedCards;
  }, [persistedCards]);

  // Update module-level callbacks on every render so the loop always calls the
  // current component's state setters — even after a Strict Mode remount.
  // onCard persists immediately so cards survive if Raycast closes mid-loop.
  updateCoverCallbacks(
    (code: string, card: Card) => {
      persistedCardsRef.current = { ...(persistedCardsRef.current ?? {}), [code]: card };
      setPersistedCards(persistedCardsRef.current);
      setLiveCards((prev) => ({ ...prev, [code]: card }));
    },
    () => {
      /* persistence already handled per-card in onCard */
    }
  );

  const storageLoaded = persistedCards !== undefined;

  // Kick off the module-level background fetcher whenever filter or sets change.
  // Gate on storageLoaded so we never pass an empty cached set while localStorage
  // is still reading from disk — which caused already-persisted covers to be re-fetched.
  useEffect(() => {
    if (allSets.length === 0 || !storageLoaded) return;
    const cached = new Set([...Object.keys(persistedCardsRef.current ?? {}), ...Object.keys(liveCards)]);
    const codes = allSets.filter((s) => matchesFilter(s, setFilter)).map((s) => s.code);
    startCoverFetch(codes, cached);
  }, [allSets.length, setFilter, fetchTrigger, storageLoaded]);

  function handleCardFetched(code: string, card: Card) {
    setLiveCards((prev) => ({ ...prev, [code]: card }));
    setPersistedCards({ ...(persistedCards ?? {}), [code]: card });
  }

  function handleCardCleared(code: string) {
    const next = { ...(persistedCards ?? {}) };
    delete next[code];
    setPersistedCards(next);
    setLiveCards((prev) => {
      const n = { ...prev };
      delete n[code];
      return n;
    });
  }

  function handleAllCleared() {
    setPersistedCards({});
    setLiveCards({});
    resetFetchedCodes();
    setFetchTrigger((n) => n + 1);
  }

  return (
    <Grid
      columns={3}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Filter sets by name or code"
      navigationTitle="Browse by Set"
      searchBarAccessory={
        <Grid.Dropdown tooltip="Set Type" value={setFilter} onChange={(v) => setSetFilter(v as SetFilter)}>
          <Grid.Dropdown.Item title="All Sets" value="all" />
          <Grid.Dropdown.Item title="Main Sets" value="main" />
          <Grid.Dropdown.Item title="Arena Sets" value="arena" />
          <Grid.Dropdown.Item title="Other Sets" value="other" />
        </Grid.Dropdown>
      }
    >
      {filteredSets.length === 0 && !isLoading ? (
        <Grid.EmptyView
          icon="🧙"
          title="No Sets Found"
          description={
            searchText.trim() ? `No sets match "${searchText}". Try a different name or code.` : "No sets available."
          }
        />
      ) : (
        filteredSets.map((set) => (
          <SetGridItem
            key={set.id}
            set={set}
            topCard={topCards[set.code]}
            onCardFetched={handleCardFetched}
            onCardCleared={handleCardCleared}
            onAllCleared={handleAllCleared}
          />
        ))
      )}
    </Grid>
  );
}
