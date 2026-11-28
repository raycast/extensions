import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  Keyboard,
  List,
  LocalStorage,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useCachedState, useLocalStorage, usePromise } from "@raycast/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, WEB_ROOT, fetchApiUsage, fetchPage, lookupCitation } from "./api";
import { detectCitation } from "./citation";
import { usesQuerySyntax } from "./query";
import { CaseRow, rowFromCluster, rowFromSearchResult } from "./rows";
import { useSavedCases } from "./saved";
import { ANY, DATE_RANGES, FEDERAL_COURTS, STATE_COURTS, courtTitle, dateRangeTitle } from "./filters";
import { snippetToMarkdown } from "./highlight";
import { synopsisToMarkdown } from "./synopsis";
import { ApiUsage, HistoryEntry, SavedCase, SearchMode } from "./types";

const HISTORY_KEY = "search-history";
const MAX_HISTORY = 20;
/** Searches you haven't repeated in a month are noise on the landing page. */
const MAX_HISTORY_AGE = 30 * 24 * 60 * 60 * 1000;
/** Fixed id so ↵ can be pinned to the search row while the query is being typed. */
const SEARCH_ITEM_ID = "run-search";
const MAX_BACK_STEPS = 10;

function parseHistory(raw: string | undefined): HistoryEntry[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (item): item is HistoryEntry => typeof item?.query === "string" && typeof item?.searchedAt === "number",
    );
  } catch {
    return [];
  }
}

/**
 * Entries are always prepended, so the list is newest-first: drop what has aged out, then cap it.
 * Applied on write and on read, so an old entry stops being offered even if you never search again.
 */
function pruneHistory(entries: HistoryEntry[]): HistoryEntry[] {
  const cutoff = Date.now() - MAX_HISTORY_AGE;
  return entries.filter((item) => item.searchedAt > cutoff).slice(0, MAX_HISTORY);
}

/** The next page comes back as a whole URL; the cursor is the only part of it that matters. */
function cursorOf(next: string | null): string | undefined {
  return next ? (new URL(next).searchParams.get("cursor") ?? undefined) : undefined;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return "";
  }
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) {
    return iso;
  }
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Entries stored before citation lookup existed carry no mode, and every one of them was run as
 * text — including any that are plainly citations. Read those the way they'd be read today; an
 * entry that records "text" explicitly was a deliberate choice and stays text.
 */
function historyMode(entry: HistoryEntry): SearchMode {
  return entry.mode ?? (detectCitation(entry.query) ? "citation" : "text");
}

/**
 * The search bar holds one accessory, and that goes to the court dropdown; the date range lives in
 * the action panel instead. Built as a function rather than a component so what lands inside
 * ActionPanel is a Section, not a wrapper around one.
 */
function filterActions(options: {
  dateRange: string;
  onDateRange: (id: string) => void;
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <ActionPanel.Section title="Filters">
      <ActionPanel.Submenu
        icon={Icon.Calendar}
        title="Filed After"
        shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}
      >
        {DATE_RANGES.map((range) => (
          <Action
            key={range.id}
            icon={range.id === options.dateRange ? Icon.Checkmark : Icon.Circle}
            title={range.title}
            onAction={() => options.onDateRange(range.id)}
          />
        ))}
      </ActionPanel.Submenu>
      {options.hasFilters ? (
        <Action
          icon={Icon.XMarkCircle}
          title="Clear Filters"
          shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
          onAction={options.onClear}
        />
      ) : null}
    </ActionPanel.Section>
  );
}

/** Steps back to the search that was on screen before this one. */
function backAction(previous: Submitted | undefined, onBack: () => void) {
  return previous ? (
    <Action
      icon={Icon.ArrowLeft}
      title={`Back to “${previous.query}”`}
      shortcut={{ modifiers: ["cmd"], key: "[" }}
      onAction={onBack}
    />
  ) : null;
}

/** A search that has been run: what was typed, what was sent, and how it was interpreted. */
type Submitted = { input: string; query: string; mode: SearchMode };

const NOTHING_SUBMITTED: Submitted = { input: "", query: "", mode: "text" };

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [submitted, setSubmitted] = useState<Submitted>(NOTHING_SUBMITTED);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(undefined);
  const [previous, setPrevious] = useState<Submitted[]>([]);
  const [showDetail, setShowDetail] = useCachedState("show-detail", true);
  // Filters are deliberately not persisted: coming back tomorrow to silently narrowed results is
  // worse than picking the court again.
  const [court, setCourt] = useState(ANY);
  const [dateRange, setDateRange] = useState(ANY);
  const { saved, isSaved, toggle: toggleSaved, remove: removeSaved, isLoading: isLoadingSaved } = useSavedCases();
  const {
    value: history,
    setValue: setHistory,
    removeValue: clearHistory,
    isLoading: isLoadingHistory,
  } = useLocalStorage<HistoryEntry[]>(HISTORY_KEY, []);

  const trimmed = searchText.trim();
  const citation = useMemo(() => detectCitation(trimmed), [trimmed]);
  // A citation belongs to the lookup and an operator query to the keyword parser; the semantic
  // engine reads both as prose and answers something else.
  const canSearchSemantically = trimmed.length > 0 && !citation && !usesQuerySyntax(trimmed);
  // The fetch is bound to ↵ rather than to every keystroke: the free tier allows 5 requests a minute.
  const needsSearch = trimmed.length > 0 && trimmed !== submitted.input;

  const remember = useCallback(
    async (query: string, mode: SearchMode, resultCount: number) => {
      // Read the stored list rather than the hook's copy of it: a cached search can resolve before
      // LocalStorage has been read, and writing from an empty value would drop the whole history.
      const previous = parseHistory(await LocalStorage.getItem<string>(HISTORY_KEY));
      const entry = { query, mode, searchedAt: Date.now(), resultCount };
      const rest = previous.filter((item) => item.query !== query || (item.mode ?? "text") !== mode);
      await setHistory(pruneHistory([entry, ...rest]));
    },
    [setHistory],
  );

  const filedAfter = useMemo(() => DATE_RANGES.find((range) => range.id === dateRange)?.from() ?? "", [dateRange]);
  // ANY is a dropdown sentinel, not a court id CourtListener knows about — "don't filter" has to
  // reach the request as no param at all.
  const courtParam = court === ANY ? "" : court;
  const hasFilters = court !== ANY || dateRange !== ANY;

  // `count` is the size of the whole result set, which only the response carries — `data` is the
  // pages accumulated so far. Kept in a ref because it is read during the render that the page's
  // arrival triggers anyway.
  const total = useRef(0);

  const isCitationMode = submitted.mode === "citation";
  const isSemantic = submitted.mode === "semantic";

  // Changing a filter re-runs the current search on its own: the args are part of the promise's
  // identity, and of each page's cache key.
  //
  // A citation is resolved by the lookup below instead, so this stays switched off in that mode —
  // running both would spend a search on a full-text query for the citation, whose result set is
  // large, unrelated, and (via `total`) the wrong count to file the lookup under in history.
  const { isLoading, data, error, revalidate, pagination } = usePromise(
    (query: string, semantic: boolean, courtId: string, after: string) =>
      async ({ cursor }: { cursor?: string }) => {
        const response = await fetchPage(query, semantic, courtId, after, cursor ?? "");
        total.current = response.count;
        return {
          data: response.results,
          hasMore: Boolean(response.next),
          cursor: cursorOf(response.next),
        };
      },
    [submitted.query, isSemantic, courtParam, filedAfter],
    {
      execute: !isCitationMode && submitted.query.length > 0,
      onData(_results, page) {
        // Later pages are the same search, so the history entry is written once. Whichever engine
        // ran is part of the entry, so re-running it from history runs the same one.
        if (!page || page.page === 0) {
          void remember(submitted.query, submitted.mode, total.current);
        }
      },
      onError(failure) {
        // With results already on screen the empty state never renders, so a page that fails
        // while scrolling would fail silently. Everything else is reported inline below.
        if (results.length === 0) {
          return;
        }
        const kind = failure instanceof ApiError ? failure.kind : "other";
        void showToast({
          style: Toast.Style.Failure,
          title: kind === "rate-limit" ? "Rate limited" : "Couldn't load more results",
          message: kind === "rate-limit" ? "Try again later." : failure.message,
        });
      },
    },
  );

  // Citation lookup is throttled in its own scope, so resolving a citation costs nothing from the
  // search budget — and CourtListener normalises the reporter itself, better than a table here can.
  const {
    isLoading: isLookingUp,
    data: lookups,
    error: lookupError,
    revalidate: revalidateLookup,
  } = usePromise(lookupCitation, [submitted.input], {
    execute: isCitationMode && submitted.input.length > 0,
    onData(found) {
      const hit = found.find((item) => item.clusters.length > 0);
      const label = hit ? (hit.normalized_citations?.[0] ?? hit.citation) : submitted.query;
      void remember(label, "citation", hit?.clusters.length ?? 0);
    },
    onError() {},
  });

  const clearFilters = useCallback(() => {
    setCourt(ANY);
    setDateRange(ANY);
  }, []);

  const runSearch = useCallback(
    (next: Submitted) => {
      // Whatever was on screen becomes the step to come back to. Its results are still cached, so
      // coming back costs nothing.
      setPrevious((stack) => (submitted.query ? [submitted, ...stack].slice(0, MAX_BACK_STEPS) : stack));
      setSearchText(next.input);
      setSubmitted(next);
      setSelectedItemId(undefined);
    },
    [submitted],
  );

  const goBack = useCallback(() => {
    const [restored, ...rest] = previous;
    if (!restored) {
      return;
    }
    setPrevious(rest);
    setSearchText(restored.input);
    setSubmitted(restored);
    setSelectedItemId(undefined);
  }, [previous]);

  const searchAsText = useCallback(
    (text: string) => runSearch({ input: text, query: text, mode: "text" }),
    [runSearch],
  );

  const onSearchTextChange = useCallback((text: string) => {
    setSearchText(text);
    // Typing moves the selection back to the search row, so ↵ always means "run this search"
    // rather than "re-run whichever recent search happened to be highlighted".
    setSelectedItemId(text.trim().length > 0 ? SEARCH_ITEM_ID : undefined);
  }, []);

  const forget = useCallback(
    (target: HistoryEntry) => {
      void setHistory(
        (history ?? []).filter(
          (item) => item.query !== target.query || (item.mode ?? "text") !== (target.mode ?? "text"),
        ),
      );
    },
    [history, setHistory],
  );

  const onToggleSave = useCallback(
    async (row: CaseRow) => {
      const nowSaved = await toggleSaved(row);
      await showToast({
        style: Toast.Style.Success,
        title: nowSaved ? "Saved case" : "Removed from saved",
        message: row.caseName,
      });
    },
    [toggleSaved],
  );

  // Results come from a 30-minute cache, so a refresh has to drop it before asking again.
  const refresh = useCallback(() => {
    fetchPage.clearCache();
    lookupCitation.clearCache();
    if (isCitationMode) {
      revalidateLookup();
    } else {
      revalidate();
    }
  }, [isCitationMode, revalidate, revalidateLookup]);

  const lookupHit = lookups?.find((item) => item.clusters.length > 0);
  const citationLabel = lookupHit ? (lookupHit.normalized_citations?.[0] ?? lookupHit.citation) : submitted.query;
  const rows: CaseRow[] = isCitationMode
    ? (lookupHit?.clusters ?? []).map(rowFromCluster)
    : (data ?? []).map(rowFromSearchResult);
  const activeError = isCitationMode ? lookupError : error;
  const isSearching = isCitationMode ? isLookingUp : isLoading;

  // What this token's limits actually are, asked only once throttling is what we're looking at.
  // The endpoint sits outside every scope it reports, so this costs nothing.
  const isRateLimited = activeError instanceof ApiError && activeError.kind === "rate-limit";
  const { data: usage } = usePromise(fetchApiUsage, [], { execute: isRateLimited, onError() {} });

  const results = rows;
  const recent = pruneHistory(history ?? []);
  const suggestions = needsSearch
    ? recent.filter((item) => item.query !== trimmed && item.query.toLowerCase().includes(trimmed.toLowerCase()))
    : [];
  // Emptying the search bar goes back to the landing page rather than leaving stale results up.
  const showResults = !needsSearch && trimmed.length > 0 && results.length > 0;
  const showLandingHistory = trimmed.length === 0 && recent.length > 0;
  const showSaved = trimmed.length === 0 && saved.length > 0;
  // Wait for the stored history before claiming there is nothing to show, so the landing page
  // doesn't flash the intro on every launch.
  const showEmptyState =
    !needsSearch && !showResults && !showLandingHistory && !showSaved && !isLoadingHistory && !isLoadingSaved;

  const historyActions = {
    onSearch: (entry: HistoryEntry) => runSearch({ input: entry.query, query: entry.query, mode: historyMode(entry) }),
    onSearchAsText: searchAsText,
    onRemove: forget,
    onClear: () => void clearHistory(),
  };

  const filters = filterActions({ dateRange, onDateRange: setDateRange, hasFilters, onClear: clearFilters });
  const back = backAction(previous[0], goBack);
  const count = (total.current || results.length).toLocaleString();
  const resultsTitle =
    submitted.mode === "citation"
      ? `Reported at ${citationLabel}`
      : [
          // Semantic ranking searches a neighbourhood rather than the whole index, and its count
          // moves — narrowing to one circuit reported more hits than the unfiltered query did. So
          // it is reported as an approximation, which is what it is.
          isSemantic ? `About ${count} results by meaning` : `${count} results`,
          court !== ANY ? courtTitle(court) : null,
          dateRange !== ANY ? dateRangeTitle(dateRange).toLowerCase() : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const resultItems = rows.map((row) => (
    <CaseItem
      key={row.id}
      row={row}
      isShowingDetail={showDetail}
      onToggleDetail={() => setShowDetail((shown) => !shown)}
      onRefresh={refresh}
      filters={filters}
      isSaved={isSaved(row.id)}
      onToggleSave={() => void onToggleSave(row)}
      back={back}
    />
  ));

  return (
    <List
      isLoading={isSearching || isLoadingHistory || isLoadingSaved}
      // Only results have a detail pane; the history and prompt rows would leave it blank.
      isShowingDetail={showResults && showDetail}
      // Same for loading more: scrolling the landing page shouldn't fetch anything.
      pagination={showResults && !isCitationMode ? pagination : undefined}
      filtering={false}
      throttle={false}
      searchText={searchText}
      onSearchTextChange={onSearchTextChange}
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => setSelectedItemId(id ?? undefined)}
      searchBarPlaceholder="Search case law or paste a citation, then press ↵"
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Court" value={court} onChange={setCourt}>
          <List.Dropdown.Item icon={Icon.Building} title="All Courts" value={ANY} />
          <List.Dropdown.Section title="Federal">
            {FEDERAL_COURTS.map((option) => (
              <List.Dropdown.Item key={option.id} title={option.title} value={option.id} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="State Courts of Last Resort">
            {STATE_COURTS.map((option) => (
              <List.Dropdown.Item key={option.id} title={option.title} value={option.id} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {needsSearch && (
        <List.Item
          id={SEARCH_ITEM_ID}
          icon={citation ? Icon.Hashtag : Icon.MagnifyingGlass}
          title={citation ?? `Search for “${trimmed}”`}
          subtitle={
            citation
              ? "Citation"
              : canSearchSemantically
                ? "CourtListener case law · ⌘⇧M by meaning"
                : "CourtListener case law"
          }
          actions={
            <ActionPanel>
              {citation && (
                <Action
                  icon={Icon.Hashtag}
                  title="Look up Citation"
                  onAction={() => runSearch({ input: trimmed, query: citation, mode: "citation" })}
                />
              )}
              <Action
                icon={Icon.MagnifyingGlass}
                title={citation ? "Search as Text Instead" : "Search Case Law"}
                shortcut={citation ? { modifiers: ["cmd", "shift"], key: "return" } : undefined}
                onAction={() => searchAsText(trimmed)}
              />
              {/* Second on the panel, not first: keyword is the faster engine and the one ↵ should
                  keep. Semantic earns its few seconds on a question, not on a case name — and it
                  is withheld entirely from a citation or an operator query, which it would answer
                  with something plausible and wrong rather than with nothing. */}
              {canSearchSemantically && (
                <Action
                  icon={Icon.Stars}
                  title="Search by Meaning"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  onAction={() => runSearch({ input: trimmed, query: trimmed, mode: "semantic" })}
                />
              )}
              {back}
              {filters}
            </ActionPanel>
          }
        />
      )}
      {suggestions.length > 0 && (
        <List.Section title="Recent Searches">
          {suggestions.map((entry) => (
            <HistoryItem key={`${historyMode(entry)}:${entry.query}`} entry={entry} {...historyActions} />
          ))}
        </List.Section>
      )}
      {showResults && <List.Section title={resultsTitle}>{resultItems}</List.Section>}
      {showSaved && (
        <List.Section title="Saved Cases">
          {saved.map((entry) => (
            <SavedCaseItem key={entry.clusterId} entry={entry} onRemove={() => void removeSaved(entry.clusterId)} />
          ))}
        </List.Section>
      )}
      {showLandingHistory && (
        <List.Section title="Recent Searches">
          {recent.map((entry) => (
            <HistoryItem key={`${historyMode(entry)}:${entry.query}`} entry={entry} {...historyActions} />
          ))}
        </List.Section>
      )}
      {showEmptyState && (
        <EmptyState
          error={trimmed.length > 0 ? activeError : undefined}
          query={trimmed.length > 0 ? (isCitationMode ? citationLabel : submitted.query) : ""}
          mode={submitted.mode}
          isLoading={isSearching}
          usage={usage}
          lookup={isCitationMode && lookups ? { status: lookups[0]?.status, found: lookups.length > 0 } : undefined}
          onRetry={isCitationMode ? revalidateLookup : revalidate}
          onSearchAsText={() => searchAsText(submitted.input)}
          onSearchSemantically={
            usesQuerySyntax(submitted.input)
              ? undefined
              : () => runSearch({ input: submitted.input, query: submitted.input, mode: "semantic" })
          }
          hasFilters={hasFilters}
          onClearFilters={clearFilters}
          back={back}
        />
      )}
    </List>
  );
}

function HistoryItem({
  entry,
  onSearch,
  onSearchAsText,
  onRemove,
  onClear,
}: {
  entry: HistoryEntry;
  onSearch: (entry: HistoryEntry) => void;
  onSearchAsText: (query: string) => void;
  onRemove: (entry: HistoryEntry) => void;
  onClear: () => void;
}) {
  const mode = historyMode(entry);
  const isCitation = mode === "citation";

  return (
    <List.Item
      id={`history-${mode}-${entry.query}`}
      icon={isCitation ? Icon.Hashtag : mode === "semantic" ? Icon.Stars : Icon.Clock}
      title={entry.query}
      subtitle={isCitation ? "Citation" : mode === "semantic" ? "By meaning" : undefined}
      accessories={[
        { text: `${entry.resultCount.toLocaleString()} results` },
        { date: new Date(entry.searchedAt), tooltip: "Last searched" },
      ]}
      actions={
        <ActionPanel>
          <Action
            icon={isCitation ? Icon.Hashtag : mode === "semantic" ? Icon.Stars : Icon.MagnifyingGlass}
            title={isCitation ? "Look up Citation" : "Search Again"}
            onAction={() => onSearch(entry)}
          />
          {isCitation && (
            <Action
              icon={Icon.MagnifyingGlass}
              title="Search as Text Instead"
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onAction={() => onSearchAsText(entry.query)}
            />
          )}
          <Action
            icon={Icon.Trash}
            title="Remove from History"
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => onRemove(entry)}
          />
          <Action
            icon={Icon.Trash}
            title="Clear Search History"
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.RemoveAll}
            onAction={onClear}
          />
        </ActionPanel>
      }
    />
  );
}

async function copyCitation(citation: string) {
  await Clipboard.copy(citation);
  await showToast({ style: Toast.Style.Success, title: "Copied citation", message: citation });
}

function SavedCaseItem({ entry, onRemove }: { entry: SavedCase; onRemove: () => void }) {
  const decided = formatDate(entry.dateFiled);

  return (
    <List.Item
      id={`saved-${entry.clusterId}`}
      icon={Icon.Bookmark}
      title={entry.caseName}
      subtitle={[entry.court, decided].filter(Boolean).join(" · ")}
      accessories={entry.citation ? [{ text: entry.citation, tooltip: "Citation" }] : undefined}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Opinion in Browser" url={`${WEB_ROOT}${entry.absoluteUrl}`} />
          {entry.citation ? (
            <Action.CopyToClipboard
              title="Copy Citation"
              content={entry.citation}
              shortcut={Keyboard.Shortcut.Common.Copy}
            />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Case Name"
            content={entry.caseName}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
          <Action
            icon={Icon.Trash}
            title="Remove from Saved"
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={onRemove}
          />
        </ActionPanel>
      }
    />
  );
}

function CaseItem({
  row,
  isShowingDetail,
  onToggleDetail,
  onRefresh,
  filters,
  isSaved,
  onToggleSave,
  back,
}: {
  row: CaseRow;
  isShowingDetail: boolean;
  onToggleDetail: () => void;
  onRefresh: () => void;
  filters: ReturnType<typeof filterActions>;
  isSaved: boolean;
  onToggleSave: () => void;
  back: ReturnType<typeof backAction>;
}) {
  const decided = formatDate(row.dateFiled);
  const citation = row.citations[0];
  const synopsis = synopsisToMarkdown(row.syllabus);

  const accessories: List.Item.Accessory[] = [];
  if (isSaved) {
    accessories.push({ icon: Icon.Bookmark, tooltip: "Saved" });
  }
  // The detail pane leaves the list column too narrow for a citation, but the year still fits —
  // and it's what tells two decisions in the same case apart at a glance.
  const year = row.dateFiled?.slice(0, 4);
  if (isShowingDetail) {
    if (year) {
      accessories.push({ text: year, tooltip: decided ? `Decided ${decided}` : undefined });
    }
  } else if (citation) {
    accessories.push({ text: citation, tooltip: "Citation" });
  } else if (row.docketNumber) {
    accessories.push({ text: `No. ${row.docketNumber}`, tooltip: "Docket number" });
  }

  return (
    <List.Item
      icon={Icon.Book}
      title={row.caseName}
      subtitle={isShowingDetail ? undefined : [row.court, decided].filter(Boolean).join(" · ")}
      accessories={accessories}
      detail={
        <List.Item.Detail
          // No heading: the case name is already the title of the row this pane belongs to, and
          // some of them run long enough to push everything else off the top of the pane.
          //
          // The summary says what the case was about and the excerpt says why this query reached
          // it, so where both exist you get both. Only about one case in thirty has a summary —
          // the syllabus is filed by a handful of state appellate courts and almost never by a
          // federal one — so the excerpt is what the pane is made of most of the time.
          markdown={[synopsis, snippetToMarkdown(row.snippet)].filter(Boolean).join("\n\n---\n\n")}
          metadata={
            <List.Item.Detail.Metadata>
              {row.court ? <List.Item.Detail.Metadata.Label title="Court" text={row.court} /> : null}
              {decided ? <List.Item.Detail.Metadata.Label title="Decided" text={decided} /> : null}
              {row.docketNumber ? <List.Item.Detail.Metadata.Label title="Docket" text={row.docketNumber} /> : null}
              {row.judges ? <List.Item.Detail.Metadata.Label title="Judges" text={row.judges} /> : null}
              <List.Item.Detail.Metadata.Separator />
              {row.citations.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Citations">
                  {row.citations.map((reported) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={reported}
                      text={reported}
                      onAction={() => void copyCitation(reported)}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : (
                <List.Item.Detail.Metadata.Label title="Citations" text="Unreported" />
              )}
              {row.status ? <List.Item.Detail.Metadata.Label title="Status" text={row.status} /> : null}
              {row.citeCount === undefined ? null : (
                <List.Item.Detail.Metadata.Label title="Cited by" text={`${row.citeCount.toLocaleString()} cases`} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Opinion in Browser" url={`${WEB_ROOT}${row.absoluteUrl}`} />
          <Action
            icon={Icon.Sidebar}
            title={isShowingDetail ? "Hide Details" : "Show Details"}
            shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
            onAction={onToggleDetail}
          />
          {citation ? (
            <Action.CopyToClipboard title="Copy Citation" content={citation} shortcut={Keyboard.Shortcut.Common.Copy} />
          ) : null}
          <Action.CopyToClipboard
            title="Copy Case Name"
            content={row.caseName}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
          />
          <Action
            icon={isSaved ? Icon.Trash : Icon.Bookmark}
            title={isSaved ? "Remove from Saved" : "Save Case"}
            shortcut={Keyboard.Shortcut.Common.Pin}
            onAction={onToggleSave}
          />
          <Action
            icon={Icon.ArrowClockwise}
            title="Search Again"
            onAction={onRefresh}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          {back}
          {filters}
        </ActionPanel>
      }
    />
  );
}

/** Seconds until a throttle lifts, said the way a person would. */
function formatWait(seconds: number): string {
  if (seconds < 60) {
    return `${Math.ceil(seconds)} seconds`;
  }
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? "a minute" : `${minutes} minutes`;
  }
  // The daily cap is the one that produces waits this long, and "360 minutes" is not how anyone
  // reads six hours.
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "an hour" : `${hours} hours`;
}

/** The throttle a request was counted against. Search and citation lookup have their own. */
function throttleScope(mode: SearchMode): string {
  return mode === "citation" ? "citations" : "user";
}

/**
 * When the throttle lifts, as epoch milliseconds, or undefined when nothing says.
 *
 * The 429's own `Retry-After` is preferred: it is the server's arithmetic, so a clock that
 * disagrees with CourtListener's can't skew it. Failing that, `/api-usage/` reports a `reset_at`
 * per limit — and a scope carries several, one for each rate, so a search that has run out of its
 * five a minute may also have run out of its hundred and twenty-five a day. Being under any one
 * of them is enough to be refused, so the wait is the longest of the exhausted ones, not the
 * first: taking the first would promise a retry in seconds to someone capped until tomorrow.
 */
function throttleLiftsAt(retryAfter: number | undefined, usage: ApiUsage | undefined, scope: string) {
  if (retryAfter !== undefined) {
    return Date.now() + retryAfter * 1000;
  }
  const exhausted = (usage?.current_usage ?? [])
    .filter((entry) => entry.scope === scope && entry.remaining === 0 && entry.reset_at)
    .map((entry) => new Date(entry.reset_at as string).getTime())
    .filter((time) => Number.isFinite(time));
  return exhausted.length > 0 ? Math.max(...exhausted) : undefined;
}

/**
 * Re-renders once a second while a countdown is on screen. Without it the wait is worked out once,
 * when the throttle is first reported, and then sits there — still saying three minutes three
 * minutes later, which is the one thing a countdown must not do.
 */
function useCountdown(enabled: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) {
      return;
    }
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);
  return now;
}

function throttleDescription(liftsAt: number | undefined, now: number): string {
  if (liftsAt === undefined) {
    return "Please retry shortly.";
  }
  const seconds = (liftsAt - now) / 1000;
  return seconds > 0 ? `Please retry in ${formatWait(seconds)}.` : "You can try again now.";
}

function EmptyState({
  error,
  query,
  mode,
  isLoading,
  usage,
  lookup,
  onRetry,
  onSearchAsText,
  onSearchSemantically,
  hasFilters,
  onClearFilters,
  back,
}: {
  error: Error | undefined;
  query: string;
  mode: SearchMode;
  isLoading: boolean;
  usage: ApiUsage | undefined;
  lookup: { status?: number; found: boolean } | undefined;
  onRetry: () => void;
  onSearchAsText: () => void;
  onSearchSemantically: (() => void) | undefined;
  hasFilters: boolean;
  onClearFilters: () => void;
  back: ReturnType<typeof backAction>;
}) {
  const kind = error instanceof ApiError ? error.kind : "other";
  // Above the early returns, and driven by a flag rather than by which branch renders, so the
  // hook order is the same on every pass through this component.
  const now = useCountdown(kind === "rate-limit");

  if (error) {
    if (kind === "auth") {
      return (
        <List.EmptyView
          icon={Icon.Key}
          title="CourtListener rejected your API token"
          description="Check the token in this extension's preferences. You can copy a fresh one from courtlistener.com/profile/api-token/."
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
              {back}
            </ActionPanel>
          }
        />
      );
    }

    if (kind === "rate-limit") {
      return (
        <List.EmptyView
          icon={Icon.Clock}
          title="You've reached your API quota"
          description={throttleDescription(
            throttleLiftsAt(error instanceof ApiError ? error.retryAfter : undefined, usage, throttleScope(mode)),
            now,
          )}
          actions={
            <ActionPanel>
              <Action icon={Icon.ArrowClockwise} title="Try Again" onAction={onRetry} />
              {back}
            </ActionPanel>
          }
        />
      );
    }

    return (
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="The search failed"
        description={error.message}
        actions={
          <ActionPanel>
            <Action icon={Icon.ArrowClockwise} title="Try Again" onAction={onRetry} />
            {back}
          </ActionPanel>
        }
      />
    );
  }

  if (isLoading) {
    // Semantic search embeds the query before it ranks anything, which takes a few seconds — long
    // enough that the wait needs to say what it is waiting for.
    return mode === "semantic" ? (
      <List.EmptyView icon={Icon.Stars} title="Searching by meaning…" description="This takes a moment longer." />
    ) : (
      <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching CourtListener…" />
    );
  }

  if (query.length === 0) {
    return (
      <List.EmptyView
        icon={Icon.Book}
        title="Search US case law"
        description="Type a query or paste a citation and press ↵ to search CourtListener's collection of court opinions. Your saved cases and recent searches will show up here."
      />
    );
  }

  if (mode === "citation") {
    // CourtListener says which kind of miss this was, so the message can too.
    const description = !lookup?.found
      ? "CourtListener's parser didn't find a citation in that text."
      : lookup.status === 400
        ? "That looks like a citation, but the reporter isn't one CourtListener knows."
        : "CourtListener has no case reported at that citation — it may be unreported, or the volume or page may be off.";

    return (
      <List.EmptyView
        icon={Icon.Hashtag}
        title={`Nothing reported at ${query}`}
        description={description}
        actions={
          <ActionPanel>
            <Action icon={Icon.MagnifyingGlass} title="Search as Text Instead" onAction={onSearchAsText} />
            {back}
          </ActionPanel>
        }
      />
    );
  }

  const isSemantic = mode === "semantic";
  return (
    <List.EmptyView
      icon={isSemantic ? Icon.Stars : Icon.MagnifyingGlass}
      title="No cases found"
      description={
        // Worth saying here and nowhere else: CourtListener returns published opinions only unless
        // a search asks for more, so an unpublished case is missing rather than absent.
        hasFilters
          ? `Nothing matching “${query}” got past the current filters. Only published opinions are searched.`
          : isSemantic
            ? `Nothing on CourtListener came close to “${query}”. Only published opinions are searched.`
            : `Nothing on CourtListener matches “${query}”. Only published opinions are searched.`
      }
      actions={
        <ActionPanel>
          {hasFilters ? <Action icon={Icon.XMarkCircle} title="Clear Filters" onAction={onClearFilters} /> : null}
          {/* The engines miss on different things, so the one you didn't run is the next thing
              worth trying: keywords fail a question, meaning fails an exact phrase. */}
          {isSemantic ? (
            <Action icon={Icon.MagnifyingGlass} title="Search by Keyword Instead" onAction={onSearchAsText} />
          ) : onSearchSemantically ? (
            <Action icon={Icon.Stars} title="Search by Meaning Instead" onAction={onSearchSemantically} />
          ) : null}
          {back}
        </ActionPanel>
      }
    />
  );
}
