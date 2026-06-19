import { Grid, List, ActionPanel, Action, showToast, Toast, Color, Icon, useNavigation } from "@raycast/api";
import { CardDetailView, CardActions } from "./card-views";
import { useState, useMemo, useEffect, useRef } from "react";
import { useFetch, useLocalStorage } from "@raycast/utils";
import { COLLECTION_IDS_KEY, COLLECTION_NAMES_KEY } from "./collection";
import {
  type Card,
  type ScryfallSearchResponse,
  type SortOrder,
  getCardImageUri,
  isFlippable,
  sortCards,
  scryfallMultiUrl,
  FEEDBACK_URL,
  SAVED_CARDS_KEY,
} from "./shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEARCH_HISTORY_KEY = "searchHistory";
const MAX_HISTORY = 15;

// ─── Main Search View ─────────────────────────────────────────────────────────

export default function Command({
  initialSearch = "",
  initialOrder = "name",
}: {
  initialSearch?: string;
  initialOrder?: SortOrder;
}) {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState(initialSearch);
  const [debouncedSearchText, setDebouncedSearchText] = useState(initialSearch);
  const [order, setOrder] = useState<SortOrder>(initialOrder);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const historySavedForQuery = useRef(false);
  const { value: savedCards, setValue: setSavedCards } = useLocalStorage<Card[]>(SAVED_CARDS_KEY, []);
  const savedCardIds = useMemo(() => new Set((savedCards ?? []).map((c) => c.id)), [savedCards]);
  const { value: searchHistory, setValue: setSearchHistory } = useLocalStorage<string[]>(SEARCH_HISTORY_KEY, []);
  const { value: collectionIds } = useLocalStorage<string[]>(COLLECTION_IDS_KEY, []);
  const { value: collectionNames } = useLocalStorage<string[]>(COLLECTION_NAMES_KEY, []);
  const collectionIdSet = useMemo(() => new Set(collectionIds ?? []), [collectionIds]);
  const collectionNameSet = useMemo(() => new Set(collectionNames ?? []), [collectionNames]);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());

  function toggleFlip(id: string) {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSave(card: Card) {
    if (savedCardIds.has(card.id)) {
      setSavedCards((savedCards ?? []).filter((c) => c.id !== card.id));
      showToast({ style: Toast.Style.Success, title: "Removed from Saved" });
    } else {
      setSavedCards([...(savedCards ?? []), card]);
      showToast({ style: Toast.Style.Success, title: "Card Bookmarked" });
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchText(searchText), 200);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    setSelectedIds(new Set());
    historySavedForQuery.current = false;
  }, [debouncedSearchText]);

  function removeFromHistory(query: string) {
    setSearchHistory((searchHistory ?? []).filter((q) => q !== query));
  }

  function clearHistory() {
    setSearchHistory([]);
  }

  const { isLoading, data } = useFetch<ScryfallSearchResponse>(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(debouncedSearchText)}&unique=cards`,
    {
      execute: debouncedSearchText.trim().length > 0,
      keepPreviousData: true,
      onError: (err) => {
        const isNotFound = err.message.includes("404") || err.message.includes("No cards found");
        if (!isNotFound) {
          console.error("[Scrycast] Search error:", err.message, "\nStack:", err.stack);
          showToast({ style: Toast.Style.Failure, title: "Search failed", message: err.message });
        } else {
          console.log(`[Scrycast] No results for query: "${debouncedSearchText}"`);
        }
      },
    }
  );

  const cards = useMemo(() => sortCards(data?.data ?? [], order), [data, order]);

  function saveToHistory(query: string) {
    if (historySavedForQuery.current) return;
    const q = query.trim();
    if (!q) return;
    historySavedForQuery.current = true;
    const filtered = (searchHistory ?? []).filter((h) => h !== q);
    setSearchHistory([q, ...filtered].slice(0, MAX_HISTORY));
  }

  const hasResults = cards.length > 0;
  const isSearching = isLoading && debouncedSearchText.trim().length > 0 && !hasResults;
  const selectedCards = cards.filter((c) => selectedIds.has(c.id));
  const isMultiSelect = selectedIds.size >= 1;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (searchText === "") {
    return (
      <List
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder='Search cards — try "t:creature c:red cmc<=3" or just a card name'
      >
        {(searchHistory ?? []).length === 0 ? (
          <List.EmptyView
            icon="🧙"
            title="Search Scryfall"
            description='Type a card name or Scryfall syntax to find cards — e.g. "t:dragon pow>=5"'
          />
        ) : (
          <>
            <List.Section title="Recent Searches">
              {(searchHistory ?? []).map((query) => (
                <List.Item
                  key={query}
                  title={query}
                  icon={Icon.Clock}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Search Again"
                        icon={Icon.MagnifyingGlass}
                        onAction={() => push(<Command initialSearch={query} />)}
                      />
                      <Action
                        title="Remove from History"
                        icon={Icon.Trash}
                        shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                        onAction={() => removeFromHistory(query)}
                      />
                    </ActionPanel>
                  }
                />
              ))}
            </List.Section>
            <List.Section>
              <List.Item
                title="Clear All History"
                icon={Icon.Trash}
                actions={
                  <ActionPanel>
                    <Action title="Clear All History" icon={Icon.Trash} onAction={clearHistory} />
                  </ActionPanel>
                }
              />
            </List.Section>
          </>
        )}
      </List>
    );
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
      searchBarPlaceholder='Search cards — try "t:creature c:red cmc<=3" or just a card name'
      searchBarAccessory={
        <Grid.Dropdown tooltip="Sort Order" value={order} onChange={(v) => setOrder(v as SortOrder)}>
          <Grid.Dropdown.Item title="Name (A → Z)" value="name" />
          <Grid.Dropdown.Item title="EDHRec Rank (High → Low)" value="edhrec" />
          <Grid.Dropdown.Item title="Price (High → Low)" value="usd" />
        </Grid.Dropdown>
      }
    >
      {isSearching ? (
        <Grid.EmptyView icon="🧙" title="Searching…" description={`Looking up "${debouncedSearchText}"`} />
      ) : !hasResults ? (
        <Grid.EmptyView
          icon="🧙"
          title={debouncedSearchText.trim() ? "No Cards Found" : "Search Scryfall"}
          description={
            debouncedSearchText.trim()
              ? `No cards match "${debouncedSearchText}". Try different Scryfall syntax.`
              : 'Type a card name or Scryfall syntax to find cards — e.g. "t:dragon pow>=5"'
          }
        />
      ) : (
        <Grid.Section
          title={
            selectedIds.size > 0
              ? `${selectedIds.size} selected · ${data?.total_cards?.toLocaleString() ?? cards.length} results`
              : `${data?.total_cards?.toLocaleString() ?? cards.length} result${(data?.total_cards ?? 0) !== 1 ? "s" : ""}`
          }
          subtitle={data?.has_more ? "Showing first 175 — refine your search to narrow results" : undefined}
        >
          {cards.map((card) => {
            const isDFC = isFlippable(card);
            const faceIndex = isDFC && flippedCards.has(card.id) ? 1 : 0;
            const activeFace = isDFC ? card.card_faces![faceIndex] : null;
            const imageUri = activeFace?.image_uris?.png ?? getCardImageUri(card);
            const isSelected = selectedIds.has(card.id);
            const isSaved = savedCardIds.has(card.id);
            const exactMatch = collectionIdSet.has(card.id);
            const nameMatch = !exactMatch && collectionNameSet.has(card.name);

            return (
              <Grid.Item
                key={card.id}
                content={{ source: imageUri }}
                title={`${isSelected ? "✓ " : ""}${isSaved ? "🔖 " : ""}${exactMatch ? "✅ " : nameMatch ? "☑️ " : ""}${card.name}`}
                subtitle={card.set_name}
                actions={
                  isMultiSelect ? (
                    <ActionPanel>
                      <ActionPanel.Section title={`${selectedIds.size} cards selected`}>
                        <Action.CopyToClipboard
                          title="Copy Card Names"
                          content={selectedCards.map((c) => c.name).join("\n")}
                          icon={Icon.Clipboard}
                        />
                        <Action.OpenInBrowser
                          title="Show in Scryfall"
                          url={scryfallMultiUrl(selectedCards)}
                          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                        />
                        <Action
                          title={isSelected ? "Deselect Card" : "Select Card"}
                          icon={isSelected ? Icon.XMarkCircle : Icon.Checkmark}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                          onAction={() => toggleSelect(card.id)}
                        />
                        <Action
                          title="Clear Selection"
                          icon={Icon.Trash}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                          onAction={() => setSelectedIds(new Set())}
                        />
                      </ActionPanel.Section>
                      <ActionPanel.Section title="Feedback">
                        <Action.OpenInBrowser
                          title="Submit Bug or Feature Request"
                          url={FEEDBACK_URL}
                          icon={Icon.Bug}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  ) : (
                    <CardActions
                      card={card}
                      imageUri={imageUri}
                      searchTagTarget={(query) => <Command initialSearch={query} />}
                      isDFC={isDFC}
                      faceIndex={faceIndex}
                      onFlip={() => toggleFlip(card.id)}
                      onShowDetails={() => {
                        saveToHistory(debouncedSearchText);
                        push(
                          <CardDetailView card={card} searchTagTarget={(query) => <Command initialSearch={query} />} />
                        );
                      }}
                      isSaved={isSaved}
                      onToggleSave={toggleSave}
                      isSelected={isSelected}
                      onToggleSelect={toggleSelect}
                    >
                      {(searchHistory ?? []).includes(debouncedSearchText.trim()) && (
                        <ActionPanel.Section title="Search History">
                          <Action
                            title="Remove Search from History"
                            icon={Icon.Trash}
                            shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                            onAction={() => removeFromHistory(debouncedSearchText.trim())}
                          />
                        </ActionPanel.Section>
                      )}
                    </CardActions>
                  )
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
