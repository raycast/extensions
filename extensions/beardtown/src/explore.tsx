import { Action, ActionPanel, Grid, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAllEntriesForFilter, fetchPaginatedChallenges, RequestError } from "./api";
import { RESOURCE_CONFIG } from "./config";
import { entryActions, tShirtEntryActions } from "./explore-ui";
import {
  filterEntries,
  getChallengeAccessory,
  getDedupKey,
  groupChallengeEntriesByYear,
  getNonChallengeAccessories,
  getNonChallengeListIcon,
  parsePageNumber,
  sortEntries,
  toChallengeEntries,
  toTShirtEntries,
} from "./lib/records";
import type { ChallengeEntry, ChallengeFilter } from "./types";

export default function Command() {
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [allChallengeEntries, setAllChallengeEntries] = useState<ChallengeEntry[] | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<ChallengeFilter>("challenges");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [lastPage, setLastPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [pageSize, setPageSize] = useState(50);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const requestContextRef = useRef(0);
  const selectedResource = RESOURCE_CONFIG[selectedFilter];
  const isTShirtsView = selectedFilter === "tshirts";
  const isGridView = selectedFilter === "challenges" || isTShirtsView;
  const hasSearchText = searchText.trim().length > 0;
  const filteredEntries = useMemo(() => filterEntries(entries, searchText), [entries, searchText]);
  const challengeGridSections = useMemo(
    () =>
      selectedFilter === "challenges"
        ? groupChallengeEntriesByYear(filteredEntries, allChallengeEntries ?? entries)
        : [],
    [allChallengeEntries, entries, filteredEntries, selectedFilter],
  );

  useEffect(() => {
    if (selectedFilter !== "challenges") {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const loadedEntries = await fetchAllEntriesForFilter("challenges");
        if (!cancelled) {
          setAllChallengeEntries(loadedEntries);
        }
      } catch {
        if (!cancelled) {
          setAllChallengeEntries(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedFilter]);

  const loadInitial = useCallback(async () => {
    const context = requestContextRef.current + 1;
    requestContextRef.current = context;

    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    setEntries([]);
    if (selectedFilter === "challenges") {
      setAllChallengeEntries(null);
    }
    setSelectedItemId(undefined);
    setNextUrl(null);
    setNextPage(null);
    setLastPage(1);
    setHasMore(false);

    try {
      const page = await fetchPaginatedChallenges(selectedFilter, { page: 1 });
      if (context !== requestContextRef.current) {
        return;
      }

      const normalized =
        selectedFilter === "tshirts" ? toTShirtEntries(page.records) : toChallengeEntries(page.records, selectedFilter);
      setEntries(normalized);
      setNextUrl(page.nextUrl);
      setNextPage(page.nextPage);
      setLastPage(1);
      setPageSize(page.pageSize);
      setHasMore(page.nextUrl !== null || page.nextPage !== null || page.records.length >= page.pageSize);
    } catch (loadError) {
      if (context !== requestContextRef.current) {
        return;
      }

      const message =
        loadError instanceof Error ? loadError.message : `Failed to load ${selectedResource.title.toLowerCase()}`;
      setError(message);
    } finally {
      if (context === requestContextRef.current) {
        setIsLoading(false);
      }
    }
  }, [selectedFilter, selectedResource.title]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }

    const context = requestContextRef.current;
    setIsLoadingMore(true);

    const pageToLoad = nextPage ?? (nextUrl ? parsePageNumber(nextUrl) : null) ?? lastPage + 1;
    const urlToLoad = nextUrl ?? undefined;

    try {
      const page = await fetchPaginatedChallenges(selectedFilter, { page: pageToLoad, url: urlToLoad });
      if (context !== requestContextRef.current) {
        return;
      }

      setEntries((current) => {
        const knownKeys = new Set(current.map((entry) => getDedupKey(entry.record, entry.id)));
        const incomingBase =
          selectedFilter === "tshirts"
            ? toTShirtEntries(page.records, current.length)
            : toChallengeEntries(page.records, selectedFilter, current.length);
        const incoming = incomingBase.filter((entry) => {
          const key = getDedupKey(entry.record, entry.id);
          if (knownKeys.has(key)) {
            return false;
          }
          knownKeys.add(key);
          return true;
        });

        return sortEntries([...current, ...incoming], selectedFilter);
      });

      setLastPage(pageToLoad);
      setNextUrl(page.nextUrl);
      setNextPage(page.nextPage);
      setPageSize(page.pageSize);
      setHasMore(page.nextUrl !== null || page.nextPage !== null || page.records.length >= page.pageSize);
    } catch (loadError) {
      if (context !== requestContextRef.current) {
        return;
      }

      const message =
        loadError instanceof Error ? loadError.message : `Failed to load more ${selectedResource.title.toLowerCase()}`;
      if (loadError instanceof RequestError && loadError.status === 404) {
        setNextUrl(null);
        setNextPage(null);
        setHasMore(false);
      } else {
        setError(message);
      }
    } finally {
      if (context === requestContextRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [hasMore, isLoading, isLoadingMore, lastPage, nextPage, nextUrl, selectedFilter, selectedResource.title]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!hasSearchText || !hasMore || isLoading || isLoadingMore) {
      return;
    }

    const context = requestContextRef.current;
    setIsLoadingMore(true);

    void (async () => {
      try {
        const allEntries = await fetchAllEntriesForFilter(selectedFilter);
        if (context !== requestContextRef.current) {
          return;
        }

        setEntries(allEntries);
        setNextUrl(null);
        setNextPage(null);
        setHasMore(false);
      } catch (loadError) {
        if (context !== requestContextRef.current) {
          return;
        }

        const message =
          loadError instanceof Error ? loadError.message : `Failed to search ${selectedResource.title.toLowerCase()}`;
        setError(message);
      } finally {
        if (context === requestContextRef.current) {
          setIsLoadingMore(false);
        }
      }
    })();
  }, [hasMore, hasSearchText, isLoading, isLoadingMore, selectedFilter, selectedResource.title]);

  useEffect(() => {
    if (filteredEntries.length === 0) {
      return;
    }

    if (selectedItemId && filteredEntries.some((entry) => entry.id === selectedItemId)) {
      return;
    }

    setSelectedItemId(filteredEntries[0]?.id);
  }, [filteredEntries, selectedItemId]);

  const dropdown = isGridView
    ? buildGridDropdown(selectedFilter, setSelectedFilter)
    : buildListDropdown(selectedFilter, setSelectedFilter);
  const emptyView =
    !error && filteredEntries.length === 0
      ? {
          title: `No ${selectedResource.title} Found`,
          description: hasSearchText ? `No matches found in ${selectedResource.title}.` : `No matches found.`,
        }
      : null;

  if (!isGridView) {
    return (
      <List
        isLoading={isLoading || isLoadingMore}
        filtering={false}
        selectedItemId={selectedItemId}
        onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
        searchBarPlaceholder={`Search ${selectedResource.title}`}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarAccessory={dropdown}
        pagination={{ pageSize, hasMore, onLoadMore: loadMore }}
      >
        {error ? (
          <List.EmptyView
            title={`Unable to Load ${selectedResource.title}`}
            description={error}
            icon={Icon.Warning}
            actions={
              <ActionPanel>
                <Action title="Retry" onAction={() => void loadInitial()} />
              </ActionPanel>
            }
          />
        ) : null}

        {emptyView ? (
          <List.EmptyView title={emptyView.title} description={emptyView.description} icon={Icon.MagnifyingGlass} />
        ) : null}

        {filteredEntries.map((entry) => (
          <List.Item
            key={entry.id}
            id={entry.id}
            title={entry.title}
            subtitle={entry.subtitle || undefined}
            keywords={entry.keywords}
            icon={getNonChallengeListIcon(entry)}
            accessories={getNonChallengeAccessories(entry.record)}
            actions={entryActions(entry, selectedFilter, entries)}
          />
        ))}
      </List>
    );
  }

  return (
    <Grid
      isLoading={isLoading || isLoadingMore}
      filtering={false}
      columns={4}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarPlaceholder={`Search ${selectedResource.title}`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarAccessory={dropdown}
      pagination={{ pageSize, hasMore, onLoadMore: loadMore }}
    >
      {error ? (
        <Grid.EmptyView
          title={`Unable to Load ${selectedResource.title}`}
          description={error}
          icon={Icon.Warning}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => void loadInitial()} />
            </ActionPanel>
          }
        />
      ) : null}

      {emptyView ? (
        <Grid.EmptyView title={emptyView.title} description={emptyView.description} icon={Icon.MagnifyingGlass} />
      ) : null}

      {selectedFilter === "challenges"
        ? challengeGridSections.map((section) => (
            <Grid.Section
              key={section.title}
              title={section.title}
              subtitle={`${section.count} ${section.count === 1 ? "Challenge" : "Challenges"}`}
            >
              {section.items.map((entry) => (
                <Grid.Item
                  key={entry.id}
                  id={entry.id}
                  title={entry.title}
                  keywords={entry.keywords}
                  subtitle={entry.subtitle || undefined}
                  content={entry.thumbnailUrl ? { source: entry.thumbnailUrl } : Icon.Image}
                  accessory={getChallengeAccessory(entry.record)}
                  actions={entryActions(entry, "challenges", entries)}
                />
              ))}
            </Grid.Section>
          ))
        : filteredEntries.map((entry) => (
            <Grid.Item
              key={entry.id}
              id={entry.id}
              title=""
              keywords={entry.keywords}
              subtitle={undefined}
              content={
                entry.thumbnailUrl
                  ? {
                      source: entry.thumbnailUrl,
                      tooltip: `${entry.title} Challenge${entry.subtitle ? ` at ${entry.subtitle}` : ""}`,
                    }
                  : Icon.Image
              }
              accessory={undefined}
              actions={tShirtEntryActions(entry)}
            />
          ))}
    </Grid>
  );
}

function buildListDropdown(selectedFilter: ChallengeFilter, setSelectedFilter: (value: ChallengeFilter) => void) {
  return (
    <List.Dropdown
      tooltip="Filter Challenges"
      value={selectedFilter}
      onChange={(value) => setSelectedFilter(value as ChallengeFilter)}
    >
      <List.Dropdown.Section>
        {(["challenges", "highlights", "consumed", "prizes", "guests", "series"] as ChallengeFilter[]).map((value) => {
          const resource = RESOURCE_CONFIG[value];
          return <List.Dropdown.Item key={value} title={resource.title} value={value} icon={resource.icon} />;
        })}
      </List.Dropdown.Section>
      <List.Dropdown.Section>
        <List.Dropdown.Item title={RESOURCE_CONFIG.tshirts.title} value="tshirts" icon={RESOURCE_CONFIG.tshirts.icon} />
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}

function buildGridDropdown(selectedFilter: ChallengeFilter, setSelectedFilter: (value: ChallengeFilter) => void) {
  return (
    <Grid.Dropdown
      tooltip="Filter Challenges"
      value={selectedFilter}
      onChange={(value) => setSelectedFilter(value as ChallengeFilter)}
    >
      <Grid.Dropdown.Section>
        {(["challenges", "highlights", "consumed", "prizes", "guests", "series"] as ChallengeFilter[]).map((value) => {
          const resource = RESOURCE_CONFIG[value];
          return <Grid.Dropdown.Item key={value} title={resource.title} value={value} icon={resource.icon} />;
        })}
      </Grid.Dropdown.Section>
      <Grid.Dropdown.Section>
        <Grid.Dropdown.Item title={RESOURCE_CONFIG.tshirts.title} value="tshirts" icon={RESOURCE_CONFIG.tshirts.icon} />
      </Grid.Dropdown.Section>
    </Grid.Dropdown>
  );
}
