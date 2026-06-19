import { Grid, List, ActionPanel, Action, showToast, Toast, Color, Icon, useNavigation, Form } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import { useFetch, useLocalStorage } from "@raycast/utils";
import {
  parseCollectionCSVWithStats,
  COLLECTION_IDS_KEY,
  COLLECTION_NAMES_KEY,
  COLLECTION_STATS_KEY,
  CollectionStats,
} from "./collection";
import {
  type Card,
  type ScryfallSearchResponse,
  getCardImageUri,
  getEdhrecUrl,
  copyCardImage,
  FEEDBACK_URL,
} from "./shared";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatStats(stats: CollectionStats): string {
  const parts = [`${stats.totalCopies.toLocaleString()} cards`];
  if (stats.setCount > 0) parts.push(`${stats.setCount.toLocaleString()} sets`);
  return parts.join(" · ");
}

// ─── Import CSV Form ──────────────────────────────────────────────────────────

function ImportCSVView({
  onImport,
  existingStats,
}: {
  onImport: (ids: string[], names: string[], stats: CollectionStats) => void;
  existingStats?: CollectionStats | null;
}) {
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  async function handleImport() {
    const path = filePaths[0];
    if (!path) {
      showToast({ style: Toast.Style.Failure, title: "Select a CSV file first" });
      return;
    }

    setIsImporting(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Importing collection…" });

    try {
      const { ids, names, stats } = await parseCollectionCSVWithStats(path);
      toast.style = Toast.Style.Success;
      toast.title = `Imported ${stats.totalCopies.toLocaleString()} cards`;
      toast.message = formatStats(stats);
      onImport(ids, names, stats);
    } catch (err) {
      toast.style = Toast.Style.Failure;
      toast.title = "Import failed";
      toast.message = (err as Error).message;
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Form
      navigationTitle="Import ManaBox Collection"
      isLoading={isImporting}
      actions={
        <ActionPanel>
          <Action title="Import Collection" icon={Icon.Download} onAction={handleImport} />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="csvFile"
        title="ManaBox CSV"
        allowMultipleSelection={false}
        value={filePaths}
        onChange={setFilePaths}
        info="Select your ManaBox CSV export"
      />
      <Form.Description
        title="How to export from ManaBox"
        text="In ManaBox: tap ··· → Export → CSV. Then select that file above."
      />
      {existingStats && <Form.Description title="Current Collection" text={formatStats(existingStats)} />}
    </Form>
  );
}

// ─── Collection Grid ──────────────────────────────────────────────────────────

function CollectionGrid({
  collectionIds,
  stats,
  onImport,
  onClearCollection,
}: {
  collectionIds: string[];
  stats: CollectionStats | null;
  onImport: (ids: string[], names: string[], stats: CollectionStats) => void;
  onClearCollection: () => void;
}) {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const collectionIdSet = useMemo(() => new Set(collectionIds), [collectionIds]);
  const { value: savedCards } = useLocalStorage<{ id: string }[]>("savedCards", []);
  const savedCardIds = useMemo(() => new Set((savedCards ?? []).map((c) => c.id)), [savedCards]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 200);
    return () => clearTimeout(timer);
  }, [searchText]);

  const isSearchMode = debouncedSearch.trim().length > 0;

  // Search mode: query Scryfall and filter results to collection IDs
  const { isLoading: isSearchLoading, data: searchData } = useFetch<ScryfallSearchResponse>(
    `https://api.scryfall.com/cards/search?q=${encodeURIComponent(debouncedSearch)}&unique=prints`,
    {
      execute: isSearchMode,
      keepPreviousData: true,
      onError: (err) => {
        const isNotFound = err.message.includes("404") || err.message.includes("No cards found");
        if (!isNotFound) {
          showToast({ style: Toast.Style.Failure, title: "Search failed", message: err.message });
        }
      },
    }
  );

  // Browse mode: fetch first 75 cards via /cards/collection (lazy, never loads full collection)
  const browsePayload = useMemo(() => {
    if (isSearchMode) return null;
    return JSON.stringify({ identifiers: collectionIds.slice(0, 75).map((id) => ({ id })) });
  }, [collectionIds, isSearchMode]);

  const { isLoading: isBrowseLoading, data: browseData } = useFetch<{ data: Card[] }>(
    "https://api.scryfall.com/cards/collection",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: browsePayload ?? undefined,
      execute: !isSearchMode && browsePayload !== null,
      keepPreviousData: true,
      onError: (err) => {
        showToast({ style: Toast.Style.Failure, title: "Failed to load collection", message: err.message });
      },
    }
  );

  const cards = useMemo(() => {
    if (isSearchMode) return (searchData?.data ?? []).filter((c) => collectionIdSet.has(c.id));
    return [...(browseData?.data ?? [])].sort((a, b) => {
      const pa = parseFloat(a.prices?.usd ?? a.prices?.usd_foil ?? "0");
      const pb = parseFloat(b.prices?.usd ?? b.prices?.usd_foil ?? "0");
      return pb - pa;
    });
  }, [isSearchMode, searchData, browseData, collectionIdSet]);

  const isLoading = isSearchMode ? isSearchLoading : isBrowseLoading;
  const hasResults = cards.length > 0;

  // Stats line shown as section subtitle and in empty views
  const statsLine = stats ? formatStats(stats) : `${collectionIds.length.toLocaleString()} cards`;

  const browseSubtitle =
    !isSearchMode && collectionIds.length > 75
      ? `Showing 75 of ${collectionIds.length.toLocaleString()} — search to find specific cards`
      : undefined;

  return (
    <Grid
      columns={3}
      aspectRatio="2/3"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Small}
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder='Search your collection — try "t:creature c:red" or a card name'
    >
      {!hasResults ? (
        <Grid.EmptyView
          icon="🧙"
          title={isSearchMode ? "Not in Collection" : isLoading ? "Loading your collection…" : "Collection is empty"}
          description={
            isSearchMode ? `No cards matching "${debouncedSearch}" found in your collection\n${statsLine}` : statsLine
          }
          actions={
            <ActionPanel>
              <Action
                title="Import New Csv"
                icon={Icon.Download}
                onAction={() => push(<ImportCSVView onImport={onImport} existingStats={stats} />)}
              />
              <Action
                title="Clear Collection"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={onClearCollection}
              />
            </ActionPanel>
          }
        />
      ) : (
        <Grid.Section
          title={
            isSearchMode
              ? `${cards.length} match${cards.length !== 1 ? "es" : ""} in your collection`
              : `Your Collection`
          }
          subtitle={isSearchMode ? statsLine : (browseSubtitle ?? statsLine)}
        >
          {cards.map((card) => {
            const imageUri = getCardImageUri(card);
            const isSaved = savedCardIds.has(card.id);
            return (
              <Grid.Item
                key={card.id}
                content={{ source: imageUri }}
                title={`${isSaved ? "🔖 " : ""}${card.name}`}
                subtitle={card.set_name}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title={card.name}>
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
                            toast.style = Toast.Style.Failure;
                            toast.title = "Failed to copy image";
                            toast.message = (err as Error).message;
                          }
                        }}
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Collection">
                      <Action
                        title="Import New Csv"
                        icon={Icon.Download}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                        onAction={() => push(<ImportCSVView onImport={onImport} existingStats={stats} />)}
                      />
                      <Action
                        title="Clear Collection"
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                        onAction={onClearCollection}
                      />
                    </ActionPanel.Section>
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

// ─── Main Command ─────────────────────────────────────────────────────────────

export default function Command() {
  const {
    value: collectionIds,
    setValue: setCollectionIds,
    isLoading: isIdsLoading,
  } = useLocalStorage<string[]>(COLLECTION_IDS_KEY, []);
  const { setValue: setCollectionNames } = useLocalStorage<string[]>(COLLECTION_NAMES_KEY, []);
  const {
    value: collectionStats,
    setValue: setCollectionStats,
    isLoading: isStatsLoading,
  } = useLocalStorage<CollectionStats | null>(COLLECTION_STATS_KEY, null);

  const isLoading = isIdsLoading || isStatsLoading;
  const hasCollection = (collectionIds ?? []).length > 0;

  function handleImport(ids: string[], names: string[], stats: CollectionStats) {
    setCollectionIds(ids);
    setCollectionNames(names);
    setCollectionStats(stats);
  }

  function handleClear() {
    setCollectionIds([]);
    setCollectionNames([]);
    setCollectionStats(null);
    showToast({ style: Toast.Style.Success, title: "Collection cleared" });
  }

  if (isLoading) {
    return <List isLoading />;
  }

  if (!hasCollection) {
    return <ImportCSVView onImport={handleImport} existingStats={null} />;
  }

  return (
    <CollectionGrid
      collectionIds={collectionIds ?? []}
      stats={collectionStats ?? null}
      onImport={handleImport}
      onClearCollection={handleClear}
    />
  );
}
