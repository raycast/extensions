import { Grid, List, ActionPanel, Action, showToast, Toast, Color, Icon, useNavigation } from "@raycast/api";
import { PrintsView, CardDetailView } from "./card-views";
import { useState, useMemo, useEffect, useRef } from "react";
import { useFetch, usePromise, useLocalStorage } from "@raycast/utils";
import { COLLECTION_IDS_KEY, COLLECTION_NAMES_KEY } from "./collection";
import {
  type Card,
  type ScryfallSearchResponse,
  type SortOrder,
  getCardImageUri,
  getTaggerUrl,
  getEdhrecUrl,
  sortCards,
  copyCardImage,
  scryfallMultiUrl,
  FEEDBACK_URL,
  SAVED_CARDS_KEY,
} from "./shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tagging {
  tag: {
    name: string;
    type: "ORACLE_CARD_TAG" | "ILLUSTRATION_TAG" | string;
  };
}

interface TaggerResponse {
  data?: { card?: { taggings: Tagging[] } };
  errors?: Array<{ message: string }>;
}

type SortOrder = "name" | "edhrec" | "usd";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEARCH_HISTORY_KEY = "searchHistory";
const MAX_HISTORY = 15;

// ─── Tagger API ───────────────────────────────────────────────────────────────

async function fetchCardTags(set: string, collectorNumber: string): Promise<Tagging[]> {
  const cardUrl = `https://tagger.scryfall.com/card/${set}/${collectorNumber}`;

  console.log(`[Scrycast] Fetching tagger page for ${set}/${collectorNumber}`);
  const pageResponse = await fetch(cardUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!pageResponse.ok) {
    console.error(`[Scrycast] Tagger page returned ${pageResponse.status} for ${cardUrl}`);
    throw new Error(`Tagger page unavailable (${pageResponse.status})`);
  }

  const html = await pageResponse.text();
  const csrfMatch = html.match(/name="csrf-token" content="([^"]+)"/);
  if (!csrfMatch) {
    console.error("[Scrycast] CSRF token not found. Page excerpt:", html.slice(0, 500));
    throw new Error("Could not find CSRF token on tagger page");
  }

  const csrfToken = csrfMatch[1];
  const setCookies: string[] =
    typeof (pageResponse.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function"
      ? (pageResponse.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [pageResponse.headers.get("set-cookie") ?? ""];

  const cookieHeader = setCookies
    .filter(Boolean)
    .map((c) => c.split(";")[0])
    .join("; ");

  console.log(`[Scrycast] CSRF acquired (${csrfToken.slice(0, 12)}…), cookies: ${cookieHeader.slice(0, 60)}…`);

  const gqlResponse = await fetch("https://tagger.scryfall.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrfToken,
      Cookie: cookieHeader,
      Origin: "https://tagger.scryfall.com",
      Referer: cardUrl,
    },
    body: JSON.stringify({
      query: `query {
        card: cardBySet(set: ${JSON.stringify(set)}, number: ${JSON.stringify(collectorNumber)}) {
          taggings { tag { name type } }
        }
      }`,
    }),
  });

  if (!gqlResponse.ok) {
    const body = await gqlResponse.text();
    console.error(`[Scrycast] GraphQL ${gqlResponse.status}:`, body);
    throw new Error(`GraphQL request failed (${gqlResponse.status})`);
  }

  const result = (await gqlResponse.json()) as TaggerResponse;

  if (result.errors?.length) {
    console.error("[Scrycast] GraphQL errors:", JSON.stringify(result.errors, null, 2));
    throw new Error(result.errors[0]?.message ?? "GraphQL error");
  }

  const taggings: Tagging[] = result.data?.card?.taggings ?? [];
  console.log(`[Scrycast] ${taggings.length} tags returned for ${set}/${collectorNumber}`);
  return taggings;
}

// ─── Card Tags View ───────────────────────────────────────────────────────────

function tagSearchQuery(type: string, name: string): string {
  if (type === "ORACLE_CARD_TAG") return `oracletag:"${name}"`;
  if (type === "ILLUSTRATION_TAG") return `arttag:"${name}"`;
  return `"${name}"`;
}

function tagScryfallSearchUrl(type: string, name: string): string {
  if (type === "ORACLE_CARD_TAG") return `https://scryfall.com/search?q=oracletag%3A"${encodeURIComponent(name)}"`;
  if (type === "ILLUSTRATION_TAG") return `https://scryfall.com/search?q=arttag%3A"${encodeURIComponent(name)}"`;
  return `https://scryfall.com/search?q="${encodeURIComponent(name)}"`;
}

function CardTagsView({ card }: { card: Card }) {
  const imageUri = getCardImageUri(card, "png");

  const {
    isLoading,
    data: taggings,
    error,
  } = usePromise(() => fetchCardTags(card.set, card.collector_number), [], {
    onError: (err) => {
      console.error("[Scrycast] fetchCardTags failed:", err.message, "\nStack:", err.stack);
      showToast({ style: Toast.Style.Failure, title: "Failed to load tags", message: err.message });
    },
  });

  const oracleTags = (taggings ?? []).filter((t) => t.tag.type === "ORACLE_CARD_TAG");
  const artTags = (taggings ?? []).filter((t) => t.tag.type === "ILLUSTRATION_TAG");
  const otherTags = (taggings ?? []).filter(
    (t) => t.tag.type !== "ORACLE_CARD_TAG" && t.tag.type !== "ILLUSTRATION_TAG"
  );

  const cardDetail = <List.Item.Detail markdown={`<img src="${imageUri}" width="366" />`} />;

  function tagItem(t: Tagging, color: Color) {
    const query = tagSearchQuery(t.tag.type, t.tag.name);
    return (
      <List.Item
        key={t.tag.name}
        title={t.tag.name}
        icon={{ source: Icon.Tag, tintColor: color }}
        detail={cardDetail}
        actions={
          <ActionPanel>
            <Action.Push
              title="Search This Tag"
              icon={Icon.MagnifyingGlass}
              target={<Command initialSearch={query} />}
            />
            <Action.OpenInBrowser
              title="Search This Tag on Scryfall"
              icon={{ source: Icon.Globe, tintColor: Color.Blue }}
              url={tagScryfallSearchUrl(t.tag.type, t.tag.name)}
              shortcut={{ modifiers: ["cmd"], key: "return" }}
            />
            <Action.OpenInBrowser
              title="Open in Scryfall Tagger"
              url={getTaggerUrl(card)}
              icon={{ source: Icon.Tag, tintColor: Color.Orange }}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <ActionPanel.Section title="Feedback">
              <Action.OpenInBrowser title="Submit Bug or Feature Request" url={FEEDBACK_URL} icon={Icon.Bug} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List navigationTitle={`${card.name} — Tags`} isLoading={isLoading} isShowingDetail>
      {!isLoading && error && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Could Not Load Tags" description={error.message} />
      )}
      {!isLoading && !error && taggings?.length === 0 && (
        <List.EmptyView icon="🧙" title="No Tags Found" description="This card has no tagger entries yet." />
      )}
      {oracleTags.length > 0 && (
        <List.Section title="Oracle Tags">{oracleTags.map((t) => tagItem(t, Color.Blue))}</List.Section>
      )}
      {artTags.length > 0 && (
        <List.Section title="Art Tags">{artTags.map((t) => tagItem(t, Color.Purple))}</List.Section>
      )}
      {otherTags.length > 0 && (
        <List.Section title="Other Tags">{otherTags.map((t) => tagItem(t, Color.SecondaryText))}</List.Section>
      )}
    </List>
  );
}

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
            const isDFC = (card.card_faces?.length ?? 0) >= 2;
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
                  <ActionPanel>
                    {isMultiSelect ? (
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
                    ) : (
                      <ActionPanel.Section title={card.name}>
                        {isDFC && (
                          <Action
                            title={`Flip to ${card.card_faces![faceIndex === 0 ? 1 : 0].name}`}
                            icon={Icon.ArrowClockwise}
                            shortcut={{ modifiers: ["cmd"], key: "f" }}
                            onAction={() => toggleFlip(card.id)}
                          />
                        )}
                        <Action
                          title="Show Card Details"
                          icon={Icon.Eye}
                          onAction={() => {
                            saveToHistory(debouncedSearchText);
                            push(<CardDetailView card={card} />);
                          }}
                        />
                        <Action.OpenInBrowser
                          title="Open in Scryfall"
                          url={card.scryfall_uri}
                          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                        />
                        <Action.OpenInBrowser
                          title="Open in Edhrec" // eslint-disable-line @raycast/prefer-title-case
                          url={getEdhrecUrl(card.name)}
                          icon={{ source: Icon.Person, tintColor: Color.Green }}
                          shortcut={{ modifiers: ["cmd", "ctrl"], key: "return" }}
                        />
                        <Action.CopyToClipboard
                          title="Copy Card Name"
                          content={card.name}
                          shortcut={{ modifiers: ["cmd"], key: "c" }}
                          icon={Icon.Clipboard}
                        />
                        <Action
                          title="Copy Card Image"
                          icon={Icon.Image}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                          onAction={async () => {
                            const toast = await showToast({ style: Toast.Style.Animated, title: "Copying image…" });
                            try {
                              await copyCardImage(imageUri);
                              toast.style = Toast.Style.Success;
                              toast.title = "Image copied";
                            } catch (err) {
                              console.error("[Scrycast] copyCardImage failed:", (err as Error).message);
                              toast.style = Toast.Style.Failure;
                              toast.title = "Failed to copy image";
                              toast.message = (err as Error).message;
                            }
                          }}
                        />
                        <Action
                          title={isSaved ? "Remove from Bookmarks" : "Bookmark Card"}
                          icon={isSaved ? Icon.StarDisabled : Icon.Star}
                          shortcut={{ modifiers: ["cmd"], key: "b" }}
                          onAction={() => toggleSave(card)}
                        />
                        <Action.OpenInBrowser
                          title="Open in Scryfall Tagger"
                          url={getTaggerUrl(card)}
                          icon={{ source: Icon.Tag, tintColor: Color.Orange }}
                          shortcut={{ modifiers: ["cmd"], key: "t" }}
                        />
                        <Action.Push
                          title="Show Tags"
                          target={<CardTagsView card={card} />}
                          icon={{ source: Icon.Tag, tintColor: Color.Purple }}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                        />
                        <Action.Push
                          title="View All Prints"
                          target={
                            <PrintsView card={card} searchTagTarget={(query) => <Command initialSearch={query} />} />
                          }
                          icon={Icon.List}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                        />
                        <Action
                          title={isSelected ? "Deselect Card" : "Select Card"}
                          icon={isSelected ? Icon.XMarkCircle : Icon.Checkmark}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                          onAction={() => toggleSelect(card.id)}
                        />
                      </ActionPanel.Section>
                    )}
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
                    <ActionPanel.Section title="Feedback">
                      <Action.OpenInBrowser title="Submit Bug or Feature Request" url={FEEDBACK_URL} icon={Icon.Bug} />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </Grid.Section>
      )}
    </Grid>
  );
}
