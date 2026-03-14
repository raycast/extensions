import {
  Action,
  ActionPanel,
  Cache,
  Color,
  Detail,
  Grid,
  Icon,
  Image,
  List,
  environment,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const API_HOST = "https://beard.town";
const UUID = "D5A19F84-636A-476D-8C63-94A7C212E3F7";
const DEFAULT_PAGE_SIZE = 50;
const RESPONSE_CACHE_TTL_MS = 10 * 60 * 1000;
const ASSETS_DIR = environment.assetsPath;
const CHALLENGES_ACTION_ICON: Image.ImageLike = {
  source: `${ASSETS_DIR}/challenges.svg`,
  tintColor: Color.SecondaryText,
};
const DETAILS_ACTION_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/details.svg`, tintColor: Color.SecondaryText };
const GLOBE_ACTION_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/globe.svg`, tintColor: Color.SecondaryText };
const MAP_ACTION_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/map.svg`, tintColor: Color.SecondaryText };
const PLAY_ACTION_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/play.svg`, tintColor: Color.SecondaryText };
const SUCCEEDED_STATUS_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/succeeded.svg`, tintColor: Color.Green };
const FAILED_STATUS_ICON: Image.ImageLike = { source: `${ASSETS_DIR}/failed.svg`, tintColor: Color.Red };
const responseCache = new Cache({ namespace: "beardtown-api" });

type ApiRecord = Record<string, unknown>;
type ChallengeFilter = "challenges" | "highlights" | "consumed" | "prizes" | "guests" | "series" | "tshirts";

type ChallengeEntry = {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
  thumbnailUrl: string;
  record: ApiRecord;
};

type RelationItem = {
  id?: string;
  title: string;
  slug?: string;
  section?: string;
  url?: string;
};

type PagedResult = {
  records: ApiRecord[];
  nextUrl: string | null;
  nextPage: number | null;
  pageSize: number;
};

const RESOURCE_CONFIG: Record<ChallengeFilter, { title: string; path: string; icon?: Image.ImageLike }> = {
  challenges: {
    title: "Challenges",
    path: "/api/v1/challenges.json",
    icon: { source: `${ASSETS_DIR}/challenges.svg`, tintColor: Color.SecondaryText },
  },
  highlights: {
    title: "Highlights",
    path: "/api/v1/highlights.json",
    icon: { source: `${ASSETS_DIR}/highlights.svg`, tintColor: Color.SecondaryText },
  },
  consumed: {
    title: "Consumed",
    path: "/api/v1/consumed.json",
    icon: { source: `${ASSETS_DIR}/consumed.svg`, tintColor: Color.SecondaryText },
  },
  prizes: {
    title: "Prizes",
    path: "/api/v1/prizes.json",
    icon: { source: `${ASSETS_DIR}/prizes.svg`, tintColor: Color.SecondaryText },
  },
  guests: {
    title: "Guests",
    path: "/api/v1/guests.json",
    icon: { source: `${ASSETS_DIR}/guests.svg`, tintColor: Color.SecondaryText },
  },
  series: {
    title: "Series",
    path: "/api/v1/series.json",
    icon: { source: `${ASSETS_DIR}/series.svg`, tintColor: Color.SecondaryText },
  },
  tshirts: {
    title: "T-Shirts",
    path: "/api/v1/tshirts.json",
    icon: { source: `${ASSETS_DIR}/prizes.svg`, tintColor: Color.SecondaryText },
  },
};

export default function Command() {
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<ChallengeFilter>("challenges");
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [lastPage, setLastPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedItemId, setSelectedItemId] = useState<string>();
  const requestContextRef = useRef(0);
  const selectedResource = RESOURCE_CONFIG[selectedFilter];
  const isTShirtsView = selectedFilter === "tshirts";
  const isGridView = selectedFilter === "challenges" || isTShirtsView;
  const hasSearchText = searchText.trim().length > 0;
  const filteredEntries = useMemo(() => filterEntries(entries, searchText), [entries, searchText]);

  const loadInitial = useCallback(async () => {
    const context = requestContextRef.current + 1;
    requestContextRef.current = context;

    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    setEntries([]);
    setSelectedItemId(undefined);
    setNextUrl(null);
    setNextPage(null);
    setLastPage(1);
    setHasMore(false);

    try {
      if (selectedFilter === "tshirts") {
        const page = await fetchPaginatedChallenges(selectedFilter, { page: 1 });
        if (context !== requestContextRef.current) {
          return;
        }

        const normalized = toTShirtEntries(page.records);
        setEntries(normalized);
        setNextUrl(page.nextUrl);
        setNextPage(page.nextPage);
        setLastPage(1);
        setPageSize(page.pageSize);
        setHasMore(page.nextUrl !== null || page.nextPage !== null || page.records.length >= page.pageSize);
        return;
      }

      const page = await fetchPaginatedChallenges(selectedFilter, { page: 1 });
      if (context !== requestContextRef.current) {
        return;
      }

      const normalized = toChallengeEntries(page.records, selectedFilter);
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
      await showToast({
        style: Toast.Style.Failure,
        title: `Could not load ${selectedResource.title}`,
        message,
      });
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
      if (message.includes("status 404")) {
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
        searchBarAccessory={
          <List.Dropdown
            tooltip="Filter Challenges"
            value={selectedFilter}
            onChange={(value) => setSelectedFilter(value as ChallengeFilter)}
          >
            <List.Dropdown.Section>
              {(["challenges", "highlights", "consumed", "prizes", "guests", "series"] as ChallengeFilter[]).map(
                (value) => {
                  const resource = RESOURCE_CONFIG[value];
                  return <List.Dropdown.Item key={value} title={resource.title} value={value} icon={resource.icon} />;
                },
              )}
            </List.Dropdown.Section>
            <List.Dropdown.Section>
              <List.Dropdown.Item
                title={RESOURCE_CONFIG.tshirts.title}
                value="tshirts"
                icon={RESOURCE_CONFIG.tshirts.icon}
              />
            </List.Dropdown.Section>
          </List.Dropdown>
        }
        pagination={{
          pageSize,
          hasMore,
          onLoadMore: loadMore,
        }}
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

        {!error && filteredEntries.length === 0 ? (
          <List.EmptyView
            title={`No ${selectedResource.title} Found`}
            description={hasSearchText ? `No matches found in ${selectedResource.title}.` : `No matches found.`}
            icon={Icon.MagnifyingGlass}
          />
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
            actions={entryActions(entry, selectedFilter, loadInitial, entries)}
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
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter Challenges"
          value={selectedFilter}
          onChange={(value) => setSelectedFilter(value as ChallengeFilter)}
        >
          <Grid.Dropdown.Section>
            {(["challenges", "highlights", "consumed", "prizes", "guests", "series"] as ChallengeFilter[]).map(
              (value) => {
                const resource = RESOURCE_CONFIG[value];
                return <Grid.Dropdown.Item key={value} title={resource.title} value={value} icon={resource.icon} />;
              },
            )}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section>
            <Grid.Dropdown.Item
              title={RESOURCE_CONFIG.tshirts.title}
              value="tshirts"
              icon={RESOURCE_CONFIG.tshirts.icon}
            />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
      pagination={{
        pageSize,
        hasMore,
        onLoadMore: loadMore,
      }}
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

      {!error && filteredEntries.length === 0 ? (
        <Grid.EmptyView
          title={`No ${selectedResource.title} Found`}
          description={hasSearchText ? `No matches found in ${selectedResource.title}.` : `No matches found.`}
          icon={Icon.MagnifyingGlass}
        />
      ) : null}

      {filteredEntries.map((entry) => (
        <Grid.Item
          key={entry.id}
          id={entry.id}
          title={isTShirtsView ? "" : entry.title}
          keywords={entry.keywords}
          subtitle={isTShirtsView ? undefined : entry.subtitle || undefined}
          content={
            entry.thumbnailUrl
              ? {
                  source: entry.thumbnailUrl,
                  ...(isTShirtsView
                    ? { tooltip: `${entry.title} Challenge${entry.subtitle ? ` at ${entry.subtitle}` : ""}` }
                    : {}),
                }
              : Icon.Image
          }
          accessory={isTShirtsView ? undefined : getChallengeAccessory(entry.record)}
          actions={isTShirtsView ? tShirtEntryActions(entry) : entryActions(entry, "challenges", loadInitial, entries)}
        />
      ))}
    </Grid>
  );
}

function ChallengeDetail({ entry }: { entry: ChallengeEntry }) {
  const { push } = useNavigation();
  const [resolvedRecord, setResolvedRecord] = useState<ApiRecord>(entry.record);
  const [isResolvingRecord, setIsResolvingRecord] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const initialRecord = entry.record;
    setResolvedRecord(initialRecord);

    const jsonUrl = getDisplayValue(initialRecord, ["jsonUrl"], "");
    if (!jsonUrl) {
      setIsResolvingRecord(false);
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(jsonUrl, API_HOST);
    } catch {
      setIsResolvingRecord(false);
      return;
    }

    setIsResolvingRecord(true);

    void (async () => {
      try {
        const payload = await requestJson(parsedUrl.toString());
        const fullRecord = getFirstRecord(payload);
        if (!cancelled && fullRecord) {
          setResolvedRecord(unwrapRecord(fullRecord));
        }
      } catch {
        if (!cancelled) {
          setResolvedRecord(initialRecord);
        }
      } finally {
        if (!cancelled) {
          setIsResolvingRecord(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entry.id, entry.record]);

  const handleOpenRelation = useCallback(
    (item: RelationItem) => {
      const filter = getFilterForRelationSection(item.section);
      if (filter) {
        push(<RelatedResourceScreen relation={item} filter={filter} />);
        return;
      }

      if (item.url) {
        void open(item.url);
      }
    },
    [push],
  );

  return (
    <Detail
      isLoading={isResolvingRecord}
      markdown={buildDetailMarkdown(entry, resolvedRecord)}
      metadata={buildDetailMetadata(resolvedRecord, handleOpenRelation)}
      actions={
        <ActionPanel>
          {getRecordUrl(resolvedRecord) ? (
            <Action.OpenInBrowser
              title="Open in Beardtown"
              url={getRecordUrl(resolvedRecord)!}
              icon={GLOBE_ACTION_ICON}
            />
          ) : null}
          {canWatchOnYouTube(resolvedRecord) ? (
            <Action
              title="Watch on YouTube"
              icon={PLAY_ACTION_ICON}
              shortcut={{ modifiers: ["cmd"], key: "y" }}
              onAction={() => openChallengeYouTube(resolvedRecord)}
            />
          ) : null}
          {getLocationTitle(resolvedRecord) ? (
            <Action.OpenInBrowser
              title="Open on Map"
              url={getLocationMapUrl(getLocationTitle(resolvedRecord))}
              icon={MAP_ACTION_ICON}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function entryActions(
  entry: ChallengeEntry,
  selectedFilter: ChallengeFilter,
  loadInitial: () => void,
  sectionEntries: ChallengeEntry[] = [],
) {
  const isChallenge = selectedFilter === "challenges";

  return (
    <ActionPanel>
      {!isChallenge ? (
        <Action.Push
          title="View Related Challenges"
          icon={CHALLENGES_ACTION_ICON}
          target={
            <RelatedChallengesGrid
              sourceEntries={sectionEntries}
              initialEntryId={entry.id}
              parentFilter={selectedFilter}
            />
          }
        />
      ) : null}
      {isChallenge ? (
        <Action.Push
          title="View Challenge Details"
          target={<ChallengeDetail entry={entry} />}
          icon={DETAILS_ACTION_ICON}
        />
      ) : null}
      {getRecordUrl(entry.record) ? (
        <Action.OpenInBrowser title="Open in Beardtown" url={getRecordUrl(entry.record)!} icon={GLOBE_ACTION_ICON} />
      ) : null}
      {isChallenge && canWatchOnYouTube(entry.record) ? (
        <Action
          title="Watch on YouTube"
          icon={PLAY_ACTION_ICON}
          shortcut={{ modifiers: ["cmd"], key: "y" }}
          onAction={() => openChallengeYouTube(entry.record)}
        />
      ) : null}
      {isChallenge && getLocationTitle(entry.record) ? (
        <Action.OpenInBrowser
          title="Open on Map"
          url={getLocationMapUrl(getLocationTitle(entry.record))}
          icon={MAP_ACTION_ICON}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
        />
      ) : null}
    </ActionPanel>
  );
}

function tShirtEntryActions(entry: ChallengeEntry) {
  return (
    <ActionPanel>
      <Action.Push title="Open T-Shirt" target={<TShirtDetail entry={entry} />} icon={DETAILS_ACTION_ICON} />
      <Action.Push
        title="View Challenge Details"
        target={<ChallengeDetail entry={entry} />}
        icon={CHALLENGES_ACTION_ICON}
      />
    </ActionPanel>
  );
}

function TShirtDetail({ entry }: { entry: ChallengeEntry }) {
  return (
    <Detail
      markdown={entry.thumbnailUrl ? `![${entry.title}](${entry.thumbnailUrl})` : `# ${entry.title}`}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Challenge Details"
            target={<ChallengeDetail entry={entry} />}
            icon={CHALLENGES_ACTION_ICON}
          />
        </ActionPanel>
      }
    />
  );
}

function RelatedChallengesGrid({
  sourceEntries,
  initialEntryId,
  parentFilter,
}: {
  sourceEntries: ChallengeEntry[];
  initialEntryId: string;
  parentFilter: ChallengeFilter;
}) {
  const [selectedEntryId, setSelectedEntryId] = useState(initialEntryId);
  const selectedEntry = useMemo(
    () => sourceEntries.find((entry) => entry.id === selectedEntryId) ?? sourceEntries[0],
    [selectedEntryId, sourceEntries],
  );
  const relatedRecords = useMemo(
    () => (selectedEntry ? extractRelatedChallengeRecords(selectedEntry.record) : []),
    [selectedEntry],
  );
  const [resolvedRelatedRecords, setResolvedRelatedRecords] = useState<ApiRecord[] | null>(null);
  const [isLoadingResolvedRecords, setIsLoadingResolvedRecords] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setResolvedRelatedRecords(null);

    if (relatedRecords.length === 0) {
      setResolvedRelatedRecords([]);
      setIsLoadingResolvedRecords(false);
      return;
    }

    setIsLoadingResolvedRecords(true);

    void (async () => {
      try {
        const hydratedRecords = await hydrateChallengeRecords(relatedRecords);
        if (!cancelled) {
          setResolvedRelatedRecords(hydratedRecords);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingResolvedRecords(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [relatedRecords]);

  const entries = toChallengeEntries(resolvedRelatedRecords ?? [], "challenges");
  const isResolvingEntries = isLoadingResolvedRecords || resolvedRelatedRecords === null;

  return (
    <Grid
      navigationTitle={`${selectedEntry?.title ?? RESOURCE_CONFIG[parentFilter].title} Challenges`}
      isLoading={isResolvingEntries}
      columns={4}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
      searchBarPlaceholder={`Search ${selectedEntry?.title ?? RESOURCE_CONFIG[parentFilter].title} Challenges`}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip={RESOURCE_CONFIG[parentFilter].title}
          value={selectedEntry?.id}
          onChange={setSelectedEntryId}
        >
          {sourceEntries.map((entry) => (
            <Grid.Dropdown.Item key={entry.id} title={entry.title} value={entry.id} />
          ))}
        </Grid.Dropdown>
      }
    >
      {!isResolvingEntries && entries.length === 0 ? (
        <Grid.EmptyView
          title="No Related Challenges"
          description={`No related challenges were found for ${selectedEntry?.title ?? "this item"}.`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Back" onAction={() => undefined} />
            </ActionPanel>
          }
        />
      ) : null}

      {entries.map((relatedEntry) => (
        <Grid.Item
          key={relatedEntry.id}
          id={relatedEntry.id}
          title={relatedEntry.title}
          subtitle={relatedEntry.subtitle || undefined}
          keywords={relatedEntry.keywords}
          content={relatedEntry.thumbnailUrl ? { source: relatedEntry.thumbnailUrl } : Icon.Image}
          accessory={getChallengeAccessory(relatedEntry.record)}
          actions={entryActions(relatedEntry, "challenges", () => undefined)}
        />
      ))}
    </Grid>
  );
}

function RelatedResourceScreen({ relation, filter }: { relation: RelationItem; filter: ChallengeFilter }) {
  const [entries, setEntries] = useState<ChallengeEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEntries([]);
    setSelectedEntryId(null);
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const loadedEntries = await fetchAllResourceEntries(filter);
        if (cancelled) {
          return;
        }

        const matchedEntry = loadedEntries.find((entry) => relationMatchesRecord(relation, entry.record));

        if (!matchedEntry) {
          setError(`Couldn't find ${relation.title} in ${RESOURCE_CONFIG[filter].title}.`);
          setIsLoading(false);
          return;
        }

        setEntries(loadedEntries);
        setSelectedEntryId(matchedEntry.id);
        setIsLoading(false);
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : `Failed to load ${relation.title}.`);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filter, relation]);

  if (entries.length > 0 && selectedEntryId) {
    return <RelatedChallengesGrid sourceEntries={entries} initialEntryId={selectedEntryId} parentFilter={filter} />;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown=""
      metadata={
        error ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Error" text={error} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        relation.url ? (
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Beardtown" url={relation.url} icon={GLOBE_ACTION_ICON} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

async function requestJson(url: string): Promise<unknown> {
  const cached = readCachedJson(url);
  if (cached !== null) {
    return cached;
  }

  const response = await fetch(url, {
    headers: {
      "X-API-Token": UUID,
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const parsed = (await response.json()) as unknown;
  writeCachedJson(url, parsed);
  return parsed;
}

function readCachedJson(url: string): unknown | null {
  try {
    const raw = responseCache.get(url);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { at: number; value: unknown };
    if (Date.now() - parsed.at > RESPONSE_CACHE_TTL_MS) {
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

function writeCachedJson(url: string, value: unknown): void {
  try {
    responseCache.set(url, JSON.stringify({ at: Date.now(), value }));
  } catch {
    // Ignore cache write failures and keep request flow working.
  }
}

async function fetchPaginatedChallenges(
  filter: ChallengeFilter,
  options: { page?: number; url?: string },
): Promise<PagedResult> {
  const pageUrl = new URL(options.url ?? getResourceUrl(filter));

  if (!options.url) {
    pageUrl.searchParams.set("page", String(options.page ?? 1));
    pageUrl.searchParams.set("limit", String(DEFAULT_PAGE_SIZE));
  }

  const payload = await requestJson(pageUrl.toString());
  const records = getRecords(payload);
  const currentPage = parsePageNumber(pageUrl.searchParams.get("page")) ?? options.page ?? 1;
  const nextUrl = getNextPageUrl(payload, pageUrl.toString());

  return {
    records,
    nextUrl,
    nextPage: nextUrl ? parsePageNumber(nextUrl) : getNextPage(payload, currentPage),
    pageSize: getPerPage(payload) ?? DEFAULT_PAGE_SIZE,
  };
}

async function fetchAllEntriesForFilter(filter: ChallengeFilter): Promise<ChallengeEntry[]> {
  let nextUrl: string | null = getResourceUrl(filter);
  let page = 1;
  let startIndex = 0;
  const allEntries: ChallengeEntry[] = [];

  while (nextUrl) {
    const result = await fetchPaginatedChallenges(
      filter,
      nextUrl === getResourceUrl(filter) ? { page } : { url: nextUrl },
    );
    const pageEntries =
      filter === "tshirts"
        ? toTShirtEntries(result.records, startIndex)
        : toChallengeEntries(result.records, filter, startIndex);
    allEntries.push(...pageEntries);

    if (!result.nextUrl && !result.nextPage) {
      break;
    }

    startIndex += result.records.length;
    nextUrl = result.nextUrl;
    page = result.nextPage ?? page + 1;

    if (!nextUrl && result.nextPage) {
      nextUrl = getResourceUrl(filter);
    }
  }

  return sortEntries(allEntries, filter);
}

async function hydrateChallengeRecords(records: ApiRecord[]): Promise<ApiRecord[]> {
  return await Promise.all(
    records.map(async (record) => {
      const jsonUrl = getRecordJsonUrl(record);
      if (!jsonUrl) {
        return record;
      }

      try {
        const payload = await requestJson(jsonUrl);
        const fullRecord = getFirstRecord(payload);
        return fullRecord ? unwrapRecord(fullRecord) : record;
      } catch {
        return record;
      }
    }),
  );
}

function getFirstRecord(payload: unknown): ApiRecord | null {
  if (Array.isArray(payload)) {
    return payload.find(isRecord) ?? null;
  }

  const obj = asObject(payload);
  if (!obj) {
    return null;
  }

  if (isRecord(obj.data)) {
    return obj.data;
  }

  // Single challenge endpoints return the record object directly.
  if (
    typeof obj.title === "string" ||
    typeof obj.slug === "string" ||
    typeof obj.url === "string" ||
    isRecord(obj.fields)
  ) {
    return obj;
  }

  return getRecords(payload)[0] ?? null;
}

function getRecordJsonUrl(record: ApiRecord): string | null {
  const jsonUrl = getDisplayValue(record, ["jsonUrl"], "");
  if (jsonUrl) {
    try {
      return new URL(jsonUrl, API_HOST).toString();
    } catch {
      return null;
    }
  }

  const id = getDisplayValue(record, ["id"], "");
  const section = getDisplayValue(record, ["section"], "");
  if (!id || (section && section !== "challenges")) {
    return null;
  }

  return `${API_HOST}/api/v1/challenges/${id}.json`;
}

function getYouTubeUrl(record: ApiRecord): string | null {
  const videoId = getChallengeFieldValue(record, ["videoId"], "");
  return videoId ? `https://youtu.be/${videoId}` : null;
}

function canWatchOnYouTube(record: ApiRecord): boolean {
  return !!getYouTubeUrl(record) || !!getRecordJsonUrl(record);
}

async function openChallengeYouTube(record: ApiRecord): Promise<void> {
  const directUrl = getYouTubeUrl(record);
  if (directUrl) {
    await open(directUrl);
    return;
  }

  const jsonUrl = getRecordJsonUrl(record);
  if (!jsonUrl) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No YouTube video found",
    });
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Loading YouTube video",
  });

  try {
    const payload = await requestJson(jsonUrl);
    const fullRecord = getFirstRecord(payload);
    const resolvedUrl = fullRecord ? getYouTubeUrl(unwrapRecord(fullRecord)) : null;

    if (!resolvedUrl) {
      toast.style = Toast.Style.Failure;
      toast.title = "No YouTube video found";
      return;
    }

    toast.hide();
    await open(resolvedUrl);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed to load YouTube video";
    toast.message = error instanceof Error ? error.message : undefined;
  }
}

function getRecords(payload: unknown): ApiRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  const obj = asObject(payload);
  if (!obj) {
    return [];
  }

  const direct = obj.challenges ?? obj.items ?? obj.results ?? obj.data;
  if (Array.isArray(direct)) {
    return direct.filter(isRecord);
  }

  const firstArray = Object.values(obj).find(Array.isArray);
  if (Array.isArray(firstArray)) {
    return firstArray.filter(isRecord);
  }

  return [];
}

function toChallengeEntries(records: ApiRecord[], filter: ChallengeFilter, startIndex = 0): ChallengeEntry[] {
  const entries = records.map((record, index) => {
    const item = unwrapRecord(record);
    const rawTitle = getDisplayValue(
      item,
      ["title", "name", "challenge_name", "slug"],
      `Challenge ${startIndex + index + 1}`,
    );
    const title = rawTitle;
    const id = getDisplayValue(item, ["id", "uuid"], "") || buildSyntheticId(item, startIndex + index);
    const subtitle = filter === "challenges" ? getChallengeSubtitle(item) : getNonChallengeSubtitle(record, item);
    const thumbnailUrl = getImageUrl(record, item, filter);

    return {
      id,
      title,
      subtitle,
      thumbnailUrl,
      keywords: getKeywords(item, title),
      record: item,
    };
  });

  return sortEntries(entries, filter);
}

function toTShirtEntries(records: ApiRecord[], startIndex = 0): ChallengeEntry[] {
  const entries = records.flatMap((record, index) => {
    const item = unwrapRecord(record);
    const tShirtImageUrl = getDisplayValue(item, ["tShirtUrl"], "") || getTShirtImageUrl(item);
    if (!tShirtImageUrl) {
      return [];
    }

    const challengeId = getDisplayValue(item, ["id", "challengeId", "challenge_id"], "");
    const title = getDisplayValue(
      item,
      ["title", "challengeName", "challenge_name"],
      `T-Shirt ${startIndex + index + 1}`,
    );
    const locationName = getDisplayValue(item, ["locationName", "location_name"], "");
    const videoReleased = getDisplayValue(item, ["videoReleased"], "");
    const challengeRecord: ApiRecord = {
      id: challengeId || getDisplayValue(item, ["id", "uuid"], ""),
      title,
      locationName,
      ...(videoReleased ? { videoReleased } : {}),
      section: "challenges",
      jsonUrl: challengeId ? `${API_HOST}/api/v1/challenges/${challengeId}.json` : "",
    };
    const id = `${challengeRecord.id || buildSyntheticId(item, startIndex + index)}::tshirt`;

    return [
      {
        id,
        title,
        subtitle: locationName,
        thumbnailUrl: tShirtImageUrl,
        keywords: getKeywords(challengeRecord, title),
        record: challengeRecord,
      },
    ];
  });

  return sortEntries(entries, "tshirts");
}

function buildSyntheticId(record: ApiRecord, index: number): string {
  const parts = [
    getDisplayValue(record, ["slug"], ""),
    getDisplayValue(record, ["title", "name", "challenge_name"], ""),
    getDisplayValue(record, ["url"], ""),
    getDisplayValue(record, ["date", "challenge_date", "event_date"], ""),
  ].filter(Boolean);

  return parts.length > 0 ? `${parts.join("::")}::${index}` : `challenge-${index}`;
}

function unwrapRecord(record: ApiRecord): ApiRecord {
  const nested = asObject(record.data);
  const attributes = asObject(record.attributes);
  return { ...record, ...(nested ?? {}), ...(attributes ?? {}) };
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function isRecord(value: unknown): value is ApiRecord {
  return !!asObject(value);
}

function parsePageNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const numeric = Number(trimmed);
  if (Number.isInteger(numeric) && numeric > 0) {
    return numeric;
  }

  try {
    const parsed = new URL(trimmed, API_HOST);
    const page = parsed.searchParams.get("page");
    if (!page) {
      return null;
    }

    const parsedPage = Number(page);
    return Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : null;
  } catch {
    return null;
  }
}

function parsePageSize(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const numeric = Number(value.trim());
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function getNextPage(payload: unknown, currentPage: number): number | null {
  const root = asObject(payload);
  if (!root) {
    return null;
  }

  const meta = asObject(root.meta);
  const pagination = asObject(root.pagination) ?? asObject(meta?.pagination);
  const links = asObject(root.links) ?? asObject(pagination?.links);
  const containers = [root, meta, pagination, links].filter((value): value is ApiRecord => !!value);

  for (const container of containers) {
    const direct = parsePageNumber(container.next_page ?? container.nextPage ?? container.next);
    if (direct && direct > currentPage) {
      return direct;
    }

    const current = parsePageNumber(container.current_page ?? container.currentPage ?? container.page);
    const total = parsePageNumber(container.total_pages ?? container.totalPages ?? container.pages);
    if (current && total && total > current) {
      return current + 1;
    }
  }

  return null;
}

function resolveNextUrl(candidate: unknown, baseUrl: string): string | null {
  if (typeof candidate !== "string" || !candidate.trim()) {
    return null;
  }

  try {
    return new URL(candidate.trim(), baseUrl).toString();
  } catch {
    return null;
  }
}

function getNextPageUrl(payload: unknown, baseUrl: string): string | null {
  const root = asObject(payload);
  if (!root) {
    return null;
  }

  const meta = asObject(root.meta);
  const pagination = asObject(root.pagination) ?? asObject(meta?.pagination);
  const links = asObject(root.links) ?? asObject(pagination?.links);
  const containers = [root, meta, pagination, links].filter((value): value is ApiRecord => !!value);

  for (const container of containers) {
    const nextUrl = resolveNextUrl(container.next_url ?? container.nextUrl ?? container.next, baseUrl);
    if (nextUrl) {
      return nextUrl;
    }
  }

  return null;
}

function getPerPage(payload: unknown): number | null {
  const root = asObject(payload);
  if (!root) {
    return null;
  }

  const meta = asObject(root.meta);
  const pagination = asObject(root.pagination) ?? asObject(meta?.pagination);
  const containers = [root, meta, pagination].filter((value): value is ApiRecord => !!value);

  for (const container of containers) {
    const pageSize = parsePageSize(container.per_page ?? container.perPage ?? container.page_size ?? container.limit);
    if (pageSize) {
      return pageSize;
    }
  }

  return null;
}

function getDisplayValue(record: ApiRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];
    if (value === null || value === undefined) {
      continue;
    }
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return fallback;
}

function getLocationTitle(record: ApiRecord): string {
  const fields = asObject(record.fields);
  const rawLocation = fields?.location ?? record.location;
  const location = Array.isArray(rawLocation) ? asObject(rawLocation[0]) : asObject(rawLocation);

  if (location) {
    return getDisplayValue(location, ["title", "name"], "");
  }

  return "";
}

function getChallengeSubtitle(record: ApiRecord): string {
  const locationTitle = getLocationTitle(record);
  if (locationTitle) {
    return locationTitle;
  }

  return getDisplayValue(
    record,
    ["locationName", "location_name", "venue", "venueName", "venue_name", "restaurant", "place"],
    "",
  );
}

function getNonChallengeSubtitle(rawRecord: ApiRecord, normalizedRecord: ApiRecord): string {
  const challengeCount =
    getDisplayValue(rawRecord, ["challengeCount", "challenge_count"], "") ||
    getDisplayValue(normalizedRecord, ["challengeCount", "challenge_count"], "");

  if (!challengeCount) {
    return "";
  }

  return `${challengeCount} ${challengeCount === "1" ? "challenge" : "challenges"}`;
}

function buildDetailMarkdown(entry: ChallengeEntry, record: ApiRecord): string {
  const lines: string[] = [];
  const detailImageUrl = getPrimaryThumbnailUrl(record) || (getRecordJsonUrl(record) ? "" : entry.thumbnailUrl);

  lines.push(`# ${getDetailTitle(record, entry.title)}`);

  if (detailImageUrl) {
    lines.push("");
    lines.push(`![${entry.title}](${detailImageUrl})`);
    lines.push("");
  }

  return lines.join("\n");
}

function getDetailTitle(record: ApiRecord, fallbackTitle: string): string {
  const locationTitle = getChallengeSubtitle(record);
  if (locationTitle) {
    return `${fallbackTitle} Challenge at ${locationTitle}`;
  }

  return `${fallbackTitle} Challenge`;
}

function buildDetailMetadata(record: ApiRecord, onOpenRelation: (item: RelationItem) => void) {
  const locationTitle = getLocationTitle(record);
  const dateValue = formatLongDate(
    getChallengeFieldValue(record, ["videoReleased", "date", "challenge_date", "event_date", "postDate"], ""),
  );
  const statusValue = formatStatusValue(getChallengeFieldValue(record, ["status", "result", "challengeStatus"], ""));
  const urlValue = getDisplayValue(record, ["url"], "");
  const priceValue = getPriceLabel(record);
  const weightValue = getWeightLabel(record);
  const timeLimitValue = getChallengeFieldValue(record, ["timeLimit"], "");
  const timeTakenValue = getChallengeFieldValue(record, ["timeTaken"], "");
  const timeUsedValue = formatTimeUsedValue(getChallengeFieldValue(record, ["timeUsed"], ""));
  const videoLengthValue = getChallengeFieldValue(record, ["videoLength"], "");
  const joinedByItems = getRelationItems(record, ["joinedBy"]);
  const consumedItems = getRelationItems(record, ["food"]);
  const prizeItems = getRelationItems(record, ["prizes"]);
  const highlightItems = getRelationItems(record, ["stats"]);

  if (
    !locationTitle &&
    !dateValue &&
    !statusValue &&
    !priceValue &&
    !weightValue &&
    !timeLimitValue &&
    !timeTakenValue &&
    !timeUsedValue &&
    !videoLengthValue &&
    joinedByItems.length === 0 &&
    consumedItems.length === 0 &&
    prizeItems.length === 0 &&
    highlightItems.length === 0 &&
    !urlValue
  ) {
    return undefined;
  }

  return (
    <Detail.Metadata>
      {locationTitle ? (
        <Detail.Metadata.Link title="Location" text={locationTitle} target={getLocationMapUrl(locationTitle)} />
      ) : null}
      {joinedByItems.length > 0 ? (
        <Detail.Metadata.TagList title="Joined By">
          {joinedByItems.map((item) => (
            <Detail.Metadata.TagList.Item
              key={`joined-by-${item.title}`}
              text={item.title}
              onAction={() => onOpenRelation(item)}
            />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
      <Detail.Metadata.Separator />
      {priceValue ? <Detail.Metadata.Label title="Price" text={priceValue} /> : null}
      {weightValue ? <Detail.Metadata.Label title="Weight" text={weightValue} /> : null}
      <Detail.Metadata.Separator />
      {timeLimitValue ? <Detail.Metadata.Label title="Time Limit" text={timeLimitValue} /> : null}
      {timeTakenValue ? <Detail.Metadata.Label title="Time Taken" text={timeTakenValue} /> : null}
      {timeUsedValue ? <Detail.Metadata.Label title="Time Used" text={timeUsedValue} /> : null}
      {statusValue ? (
        <Detail.Metadata.Label
          title="Status"
          icon={getStatusIcon(statusValue)}
          text={{ value: statusValue, color: getStatusColor(statusValue) }}
        />
      ) : null}
      <Detail.Metadata.Separator />
      {highlightItems.length > 0 ? (
        <Detail.Metadata.TagList title="Highlights">
          {highlightItems.map((item) => (
            <Detail.Metadata.TagList.Item
              key={`highlight-${item.title}`}
              text={item.title}
              onAction={() => onOpenRelation(item)}
            />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
      {consumedItems.length > 0 ? (
        <Detail.Metadata.TagList title="Consumed">
          {consumedItems.map((item) => (
            <Detail.Metadata.TagList.Item
              key={`consumed-${item.title}`}
              text={item.title}
              onAction={() => onOpenRelation(item)}
            />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
      {prizeItems.length > 0 ? (
        <Detail.Metadata.TagList title="Prizes">
          {prizeItems.map((item) => (
            <Detail.Metadata.TagList.Item
              key={`prize-${item.title}`}
              text={item.title}
              onAction={() => onOpenRelation(item)}
            />
          ))}
        </Detail.Metadata.TagList>
      ) : null}
      <Detail.Metadata.Separator />
      {dateValue ? <Detail.Metadata.Label title="Video Released" text={dateValue} /> : null}
      {videoLengthValue ? <Detail.Metadata.Label title="Video Length" text={videoLengthValue} /> : null}
    </Detail.Metadata>
  );
}

function formatStatusValue(value: string): string {
  if (!value) {
    return "";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "succeeded") {
    return "Succeeded";
  }
  if (normalized === "failed") {
    return "Failed";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getStatusColor(status: string): Color | undefined {
  const normalized = status.trim().toLowerCase();
  if (normalized === "succeeded") {
    return Color.Green;
  }
  if (normalized === "failed") {
    return Color.Red;
  }
  return undefined;
}

function getStatusIcon(status: string): Image.ImageLike | undefined {
  const normalized = status.trim().toLowerCase();
  if (normalized === "succeeded") {
    return SUCCEEDED_STATUS_ICON;
  }
  if (normalized === "failed") {
    return FAILED_STATUS_ICON;
  }
  return undefined;
}

function formatLongDate(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getPriceLabel(record: ApiRecord): string {
  const priceRaw = getChallengeFieldValue(record, ["price"], "");
  if (!priceRaw) {
    return "";
  }

  const priceNumber = Number(priceRaw);
  if (Number.isNaN(priceNumber)) {
    return priceRaw;
  }

  const currency = getChallengeFieldValue(record, ["currency"], "").toUpperCase();
  if (currency === "USD") {
    return `${formatCurrency(priceNumber, "en-US", "USD")} USD`;
  }
  if (currency === "GBP") {
    return `${formatCurrency(priceNumber, "en-GB", "GBP")} GBP`;
  }
  if (currency === "EUR") {
    return `${formatCurrency(priceNumber, "en-IE", "EUR")} EUR`;
  }
  if (currency === "CAD") {
    return `${formatCurrency(priceNumber, "en-CA", "CAD")} CAD`;
  }

  return currency ? `${priceNumber} ${currency}` : String(priceNumber);
}

function formatCurrency(priceNumber: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(priceNumber) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(priceNumber);
}

function getWeightLabel(record: ApiRecord): string {
  const weightRaw = getChallengeFieldValue(record, ["weight"], "");
  return weightRaw ? `${weightRaw} lb` : "";
}

function formatTimeUsedValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  return trimmed.endsWith("%") ? trimmed : `${trimmed}%`;
}

function getChallengeFieldValue(record: ApiRecord, keys: string[], fallback = ""): string {
  const fields = asObject(record.fields);
  return getDisplayValue(fields ?? {}, keys, "") || getDisplayValue(record, keys, fallback);
}

function getRelationItems(record: ApiRecord, keys: string[]): RelationItem[] {
  const fields = asObject(record.fields);
  const results: RelationItem[] = [];

  for (const key of keys) {
    const value = fields?.[key] ?? record[key];
    for (const item of normalizeRelationRecords(value).map(unwrapRecord)) {
      const title = getDisplayValue(item, ["title", "name"], "");
      const url = getAbsoluteRecordUrl(item);
      const id = getDisplayValue(item, ["id"], "");
      const slug = getDisplayValue(item, ["slug"], "");
      const section = getDisplayValue(item, ["section"], "");
      if (title && !results.some((entry) => entry.title === title)) {
        results.push({
          title,
          ...(id ? { id } : {}),
          ...(slug ? { slug } : {}),
          ...(section ? { section } : {}),
          ...(url ? { url } : {}),
        });
      }
    }
  }

  return results;
}

function getAbsoluteRecordUrl(record: ApiRecord): string | undefined {
  const url = getDisplayValue(record, ["url"], "");
  if (!url) {
    return undefined;
  }

  try {
    return new URL(url, API_HOST).toString();
  } catch {
    return undefined;
  }
}

function getFilterForRelationSection(section?: string): ChallengeFilter | null {
  switch ((section ?? "").toLowerCase()) {
    case "highlights":
      return "highlights";
    case "consumed":
      return "consumed";
    case "prizes":
      return "prizes";
    case "guests":
      return "guests";
    case "series":
      return "series";
    default:
      return null;
  }
}

async function fetchAllResourceEntries(filter: ChallengeFilter): Promise<ChallengeEntry[]> {
  return fetchAllEntriesForFilter(filter);
}

function relationMatchesRecord(relation: RelationItem, record: ApiRecord): boolean {
  const recordId = getDisplayValue(record, ["id"], "");
  if (relation.id && recordId && relation.id === recordId) {
    return true;
  }

  const recordSlug = getDisplayValue(record, ["slug"], "");
  if (relation.slug && recordSlug && relation.slug === recordSlug) {
    return true;
  }

  const recordUrl = getAbsoluteRecordUrl(record);
  if (relation.url && recordUrl && relation.url === recordUrl) {
    return true;
  }

  return relation.title === getDisplayValue(record, ["title", "name"], "");
}

function getLocationMapUrl(locationTitle: string) {
  return `https://beard.town/map#${slugify(locationTitle)}`;
}

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getKeywords(record: ApiRecord, title: string): string[] {
  return Array.from(
    new Set(
      [
        title,
        getDisplayValue(record, ["slug"], ""),
        getDisplayValue(record, ["location", "venue", "food", "meal", "status"], ""),
      ].filter(Boolean),
    ),
  );
}

function filterEntries(entries: ChallengeEntry[], searchText: string): ChallengeEntry[] {
  const query = searchText.trim().toLowerCase();
  if (!query) {
    return entries;
  }

  return entries.filter((entry) => {
    const haystack = [entry.title, entry.subtitle, ...entry.keywords].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function getImageUrl(rawRecord: ApiRecord, normalizedRecord: ApiRecord, filter: ChallengeFilter): string {
  const primaryThumbnailUrl = getPrimaryThumbnailUrl(rawRecord) || getPrimaryThumbnailUrl(normalizedRecord);
  if (primaryThumbnailUrl) {
    return primaryThumbnailUrl;
  }

  if (filter !== "challenges") {
    const latestVideoThumbnailUrl =
      getLatestVideoThumbnailUrl(rawRecord) || getLatestVideoThumbnailUrl(normalizedRecord);
    if (latestVideoThumbnailUrl) {
      return latestVideoThumbnailUrl;
    }
  }

  return "";
}

function getTShirtImageUrl(record: ApiRecord): string {
  const fields = asObject(record.fields);
  const shirts = normalizeRelationRecords(fields?.tShirt ?? record.tShirt).map(unwrapRecord);

  for (const shirt of shirts) {
    const url = getDisplayValue(shirt, ["url"], "");
    if (url) {
      return url;
    }
  }

  return "";
}

function getNonChallengeListIcon(entry: ChallengeEntry): List.Item.Props["icon"] {
  if (!entry.thumbnailUrl) {
    return undefined;
  }

  const tooltip = getLatestRelatedChallengeTooltip(entry.record);
  if (tooltip) {
    return {
      value: { source: entry.thumbnailUrl },
      tooltip,
    };
  }

  return { source: entry.thumbnailUrl };
}

function getLatestRelatedChallengeTooltip(record: ApiRecord): string {
  const latest = getLatestRelatedChallenge(record);
  if (!latest) {
    return "";
  }

  const title = getDisplayValue(latest, ["title", "name", "challenge_name", "challengeTitle", "slug"], "");
  if (!title) {
    return "";
  }

  const locationName =
    getDisplayValue(latest, ["locationName"], "") ||
    getDisplayValue(asObject(latest.fields) ?? {}, ["locationName"], "") ||
    getLocationTitle(latest);

  return locationName ? `Latest: ${title} Challenge at ${locationName}` : `Latest: ${title} Challenge`;
}

function getLatestRelatedChallenge(record: ApiRecord): ApiRecord | null {
  const fields = asObject(record.fields);
  const candidateSources = [record.challenges, fields?.challenges];
  const candidates = candidateSources
    .flatMap((value) => normalizeRelationRecords(value))
    .map(unwrapRecord)
    .filter(
      (value, index, array) =>
        array.findIndex((item) => getDedupKey(item, String(index)) === getDedupKey(value, String(index))) === index,
    );

  const sortedCandidates = candidates
    .map((item, index) => ({ item, index, timestamp: getRecordTimestamp(item) }))
    .sort((left, right) => {
      if (left.timestamp === right.timestamp) {
        return left.index - right.index;
      }
      if (left.timestamp === null) {
        return 1;
      }
      if (right.timestamp === null) {
        return -1;
      }
      return right.timestamp - left.timestamp;
    });

  return sortedCandidates[0]?.item ?? null;
}

function getLatestVideoThumbnailUrl(record: ApiRecord): string {
  const fields = asObject(record.fields);
  const candidateSources = [
    fields?.latestVideo,
    fields?.latestVideos,
    fields?.video,
    fields?.videos,
    fields?.relatedVideo,
    fields?.relatedVideos,
    fields?.featuredVideo,
    fields?.featuredVideos,
    record.latestVideo,
    record.latestVideos,
    record.video,
    record.videos,
    record.relatedVideo,
    record.relatedVideos,
    record.featuredVideo,
    record.featuredVideos,
  ];

  const videos = candidateSources
    .flatMap((value) => normalizeRelationRecords(value))
    .map(unwrapRecord)
    .filter(
      (value, index, array) =>
        array.findIndex((item) => getDedupKey(item, String(index)) === getDedupKey(value, String(index))) === index,
    );

  const sortedVideos = videos
    .map((video, index) => ({ video, index, timestamp: getRecordTimestamp(video) }))
    .sort((left, right) => {
      if (left.timestamp === right.timestamp) {
        return left.index - right.index;
      }
      if (left.timestamp === null) {
        return 1;
      }
      if (right.timestamp === null) {
        return -1;
      }
      return right.timestamp - left.timestamp;
    });

  for (const { video } of sortedVideos) {
    const thumbnailUrl = getPrimaryThumbnailUrl(video);
    if (thumbnailUrl) {
      return thumbnailUrl;
    }
  }

  return "";
}

function getPrimaryThumbnailUrl(record: ApiRecord): string {
  const fields = asObject(record.fields);
  const rawFieldsThumbnail = fields?.thumbnail;
  const fieldsThumbnail = Array.isArray(rawFieldsThumbnail)
    ? asObject(rawFieldsThumbnail[0])
    : asObject(rawFieldsThumbnail);
  const fieldsThumbnailUrl = getDisplayValue(fieldsThumbnail ?? {}, ["url"], "");
  if (fieldsThumbnailUrl) {
    return fieldsThumbnailUrl;
  }

  const rawThumbnail = record.thumbnail;
  const thumbnailObject = Array.isArray(rawThumbnail) ? asObject(rawThumbnail[0]) : asObject(rawThumbnail);
  const thumbnailObjectUrl = getDisplayValue(thumbnailObject ?? {}, ["url"], "");
  if (thumbnailObjectUrl) {
    return thumbnailObjectUrl;
  }

  const thumbnail = getDisplayValue(record, ["thumbnail", "thumbnail_url", "thumbnailUrl"], "");
  if (thumbnail) {
    return thumbnail;
  }

  const url = getDisplayValue(record, ["url"], "");
  if (url && /\.(avif|gif|jpe?g|png|webp)(\?.*)?$/i.test(url)) {
    return url;
  }

  for (const key of ["thumbnail", "image", "photo", "heroImage", "mainImage"]) {
    const nested = asObject(record[key]);
    if (!nested) {
      continue;
    }

    const nestedUrl = getDisplayValue(nested, ["url", "src", "thumb", "small", "medium"], "");
    if (nestedUrl) {
      return nestedUrl;
    }
  }

  return "";
}

function normalizeRelationRecords(value: unknown): ApiRecord[] {
  if (Array.isArray(value)) {
    return value.filter(isRecord);
  }

  return isRecord(value) ? [value] : [];
}

function getRecordTimestamp(record: ApiRecord): number | null {
  const candidates = [
    record.postDate,
    record.date,
    record.videoReleased,
    record.videoReleaseDate,
    record.publishedAt,
    record.publishDate,
    record.videoDate,
    record.createdAt,
    record.updatedAt,
    asObject(record.fields)?.postDate,
    asObject(record.fields)?.date,
    asObject(record.fields)?.videoReleased,
    asObject(record.fields)?.videoReleaseDate,
    asObject(record.fields)?.publishedAt,
    asObject(record.fields)?.publishDate,
    asObject(record.fields)?.videoDate,
    asObject(record.fields)?.createdAt,
    asObject(record.fields)?.updatedAt,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "string" && typeof candidate !== "number") {
      continue;
    }

    const timestamp = new Date(candidate).getTime();
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return null;
}

function getRecordUrl(record: ApiRecord): string | null {
  const url = getDisplayValue(record, ["url"], "");
  if (!url) {
    return null;
  }

  try {
    return new URL(url, API_HOST).toString();
  } catch {
    return null;
  }
}

function getDedupKey(record: ApiRecord, fallback: string): string {
  return getDisplayValue(record, ["id", "uuid", "url", "slug"], fallback);
}

function getResourceUrl(filter: ChallengeFilter): string {
  return new URL(RESOURCE_CONFIG[filter].path, API_HOST).toString();
}

function getNonChallengeAccessories(record: ApiRecord) {
  const succeededCount = getNumericField(record, ["succeededCount", "succeeded_count"]);
  const failedCount = getNumericField(record, ["failedCount", "failed_count"]);
  const accessories = [];

  if (succeededCount !== null && succeededCount > 0) {
    accessories.push({
      text: { value: String(succeededCount), color: Color.Green },
      tooltip: "Succeeded challenges",
    });
  }

  if (failedCount !== null && failedCount > 0) {
    accessories.push({
      text: { value: String(failedCount), color: Color.Red },
      tooltip: "Failed challenges",
    });
  }

  if (succeededCount !== null && failedCount !== null) {
    const total = succeededCount + failedCount;
    if (total > 0) {
      const successRate = Math.round((succeededCount / total) * 100);
      accessories.push({
        text: { value: `${successRate}%`, color: Color.SecondaryText },
        tooltip: "Success rate",
      });
    }
  }

  return accessories.length > 0 ? accessories : undefined;
}

function getNumericField(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function sortEntries(entries: ChallengeEntry[], filter: ChallengeFilter) {
  if (filter === "challenges") {
    return entries;
  }

  if (filter === "tshirts") {
    return [...entries].sort((left, right) => {
      const leftTimestamp = getRecordTimestamp(left.record);
      const rightTimestamp = getRecordTimestamp(right.record);

      if (leftTimestamp !== null || rightTimestamp !== null) {
        if (leftTimestamp === null) return 1;
        if (rightTimestamp === null) return -1;
        if (leftTimestamp !== rightTimestamp) return rightTimestamp - leftTimestamp;
      }

      return left.title.localeCompare(right.title, undefined, { sensitivity: "base" });
    });
  }

  if (filter === "guests") {
    return [...entries].sort((left, right) =>
      left.title.localeCompare(right.title, undefined, { sensitivity: "base" }),
    );
  }

  return [...entries].sort((left, right) => getChallengeCount(right.record) - getChallengeCount(left.record));
}

function getChallengeCount(record: ApiRecord) {
  const value = record.challengeCount ?? record.challenge_count;
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getChallengeAccessory(record: ApiRecord) {
  const fields = asObject(record.fields) ?? {};
  const outcome = [
    getDisplayValue(record, ["status", "result", "outcome", "completionStatus", "challengeStatus"], ""),
    getDisplayValue(fields, ["status", "result", "outcome", "completionStatus", "challengeStatus"], ""),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const succeededFlag = pickFirstBoolean(record, ["succeeded", "success", "completed", "won", "isWinner"]);
  const failedFlag = pickFirstBoolean(record, ["failed", "failure", "lost", "dnf"]);
  const fieldSucceededFlag = pickFirstBoolean(fields, ["succeeded", "success", "completed", "won", "isWinner"]);
  const fieldFailedFlag = pickFirstBoolean(fields, ["failed", "failure", "lost", "dnf"]);

  if (succeededFlag === true || fieldSucceededFlag === true) {
    return {
      icon: SUCCEEDED_STATUS_ICON,
      tooltip: "Succeeded",
    };
  }

  if (failedFlag === true || fieldFailedFlag === true) {
    return {
      icon: FAILED_STATUS_ICON,
      tooltip: "Failed",
    };
  }

  if (["succeeded", "success", "completed", "won", "win"].some((term) => outcome.includes(term))) {
    return {
      icon: SUCCEEDED_STATUS_ICON,
      tooltip: "Succeeded",
    };
  }

  if (["failed", "fail", "lost", "loss", "dnf"].some((term) => outcome.includes(term))) {
    return {
      icon: FAILED_STATUS_ICON,
      tooltip: "Failed",
    };
  }

  return undefined;
}

function pickFirstBoolean(record: ApiRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      if (value === 1) {
        return true;
      }
      if (value === 0) {
        return false;
      }
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "1"].includes(normalized)) {
        return true;
      }
      if (["false", "no", "0"].includes(normalized)) {
        return false;
      }
    }
  }

  return undefined;
}

function extractRelatedChallengeRecords(payload: unknown): ApiRecord[] {
  const root = asObject(payload);
  if (!root) {
    return [];
  }

  const directChallenges = normalizeRelationRecords(root.challenges);
  if (directChallenges.length > 0) {
    return directChallenges.map(unwrapRecord);
  }

  const fields = asObject(root.fields);
  const fieldChallenges = normalizeRelationRecords(fields?.challenges);
  if (fieldChallenges.length > 0) {
    return fieldChallenges.map(unwrapRecord);
  }

  return [];
}
