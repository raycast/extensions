import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { SearchContext, renderItem } from "./lib/items";
import {
  runYc,
  resolveYcPath,
  type VersionGate,
  type YcResult,
} from "./lib/yc";
import {
  MissingCliEmpty,
  NotAuthedEmpty,
  UpdateRequiredEmpty,
  ErrorEmpty,
} from "./lib/empty-states";
import {
  SEARCH_TYPE_ICONS,
  SEARCH_TYPE_LABELS,
  SEARCH_TYPE_ORDER,
  type SearchItem,
  type SearchItemType,
  type SearchResponse,
} from "./lib/types";
import { useRecentSearches } from "./hooks/use-recent-searches";
import { useYcVersionGate } from "./hooks/use-yc-version-gate";
import { UpdateYcCli } from "./views/updater";
import { logger } from "@chrismessina/raycast-logger";

const log = logger.child("[search]");

const ALL_FILTER = "all" as const;
type FilterValue = SearchItemType | typeof ALL_FILTER;
const RECENT_SEARCHES_KEY = "search-recents";

export default function Command() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<FilterValue>(ALL_FILTER);
  const [isShowingDetail, setIsShowingDetail] = useState(false);
  const toggleDetail = () => setIsShowingDetail((v) => !v);
  const ycPath = resolveYcPath();

  // 500ms debounce: long enough that typing a multi-word query fires one search
  // at the end rather than one per keystroke, which both cuts latency churn and
  // keeps us under the YC server's rate limit on rapid successive calls.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 500);
    return () => clearTimeout(t);
  }, [query]);

  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    // collapsePrefixes: true — search-as-you-type, so fold "S"/"Stri"/"Stripe".
  } = useRecentSearches(RECENT_SEARCHES_KEY, 25, true);

  // Probe the CLI version on mount so a too-old binary bounces to the update
  // screen immediately — before recent searches or any query. Search is broken
  // until the user updates, so don't let the working-looking empty state show.
  const versionGate = useYcVersionGate();

  const trimmed = query.trim();
  // Hold the search exec until the version probe clears — no point spending a
  // search call on a binary we're about to send to the update screen.
  const shouldRun =
    debouncedQuery.length > 0 &&
    ycPath !== null &&
    versionGate.checked &&
    !versionGate.updateRequired;

  // Run search through runYc (execFile with a 4MB buffer + 60s timeout) rather
  // than useExec: useExec's spawn/stream path truncated large payloads (a 141KB
  // "Stripe" result arrived cut to ~131KB, breaking JSON.parse), so it's unsafe
  // for results this size.
  //
  // usePromise, NOT useCachedPromise: caching persists each query's YcResult, so
  // a repeated query renders its CACHED result instantly — meaning private
  // Bookface results could resurface after logout/auth-change before the fresh
  // call returns. usePromise doesn't persist by query. (It also has no
  // keepPreviousData — a brief spinner between queries is fine and avoids
  // showing one query's results under another's text.)
  //
  // The fetcher is annotated `: Promise<YcResult<SearchResponse>>` so TS picks
  // the non-paginated usePromise overload (otherwise it infers data as any[]).
  const {
    isLoading,
    data,
    revalidate: revalidateSearch,
  } = usePromise(
    (q: string): Promise<YcResult<SearchResponse>> =>
      runYc<SearchResponse>(["search", q, "--json"]),
    [debouncedQuery],
    {
      execute: shouldRun,
      // Persist the query as a recent search only once a search succeeds.
      onData: (result) => {
        if (result?.ok && debouncedQuery) {
          log.debug("search parsed", { items: result.data.items?.length ?? 0 });
          void addRecentSearch(debouncedQuery);
        }
      },
    },
  );

  const resultItems = data?.ok ? data.data.items : undefined;
  const items = useMemo(() => {
    const all = resultItems ?? [];
    const ordered = [...all].sort((a, b) => {
      const ai = SEARCH_TYPE_ORDER.indexOf(a.type);
      const bi = SEARCH_TYPE_ORDER.indexOf(b.type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    if (filter === ALL_FILTER) return ordered;
    return ordered.filter((i) => i.type === filter);
  }, [resultItems, filter]);

  // runYc already classified the failure into a discriminated kind, so branch on
  // that rather than sniffing an error. The mount probe is a second source of
  // the update-required signal (it fires before any query).
  const searchFailed = data && !data.ok ? data : undefined;
  const execGate: VersionGate | undefined =
    searchFailed?.kind === "update-required" ? searchFailed.gate : undefined;
  const isUpdateError = versionGate.updateRequired || execGate !== undefined;
  // Prefer the probe's gate, then the search's.
  const updateGate = versionGate.gate ?? execGate;
  // After updating, clear BOTH gate signals: the mount probe AND the search.
  const retryGate = () => {
    versionGate.revalidate();
    revalidateSearch();
  };
  const isAuthError = !isUpdateError && searchFailed?.kind === "not-authed";
  const errorMessage =
    !isUpdateError && searchFailed?.kind === "error"
      ? searchFailed.message
      : null;

  const isDebouncing = trimmed !== debouncedQuery;
  // Show the spinner while the mount probe is still resolving so we don't flash
  // the recent-searches list and then replace it with the update screen.
  const probePending = !versionGate.checked && versionGate.isLoading;
  const effectiveLoading = isLoading || isDebouncing || probePending;

  return (
    <SearchContext.Provider
      value={{
        query: debouncedQuery,
        filterType: filter === ALL_FILTER ? undefined : filter,
      }}
    >
      <List
        isLoading={effectiveLoading}
        isShowingDetail={isShowingDetail && items.length > 0}
        onSearchTextChange={setQuery}
        searchBarPlaceholder="Search Bookface for people, companies, posts…"
        searchBarAccessory={
          <TypeDropdown
            value={filter}
            onChange={setFilter}
            items={resultItems ?? []}
          />
        }
      >
        {renderBody({
          ycPath,
          errorMessage,
          isAuthError,
          isUpdateError,
          updateGate,
          revalidateGate: retryGate,
          probePending,
          trimmed,
          debouncedQuery,
          filter,
          items,
          effectiveLoading,
          recentSearches,
          setQuery,
          removeRecentSearch,
          clearRecentSearches,
          isShowingDetail,
          toggleDetail,
        })}
      </List>
    </SearchContext.Provider>
  );
}

type RenderBodyProps = {
  ycPath: string | null;
  errorMessage: string | null;
  isAuthError: boolean;
  isUpdateError: boolean;
  updateGate: VersionGate | undefined;
  revalidateGate: () => void;
  probePending: boolean;
  trimmed: string;
  debouncedQuery: string;
  filter: FilterValue;
  items: SearchItem[];
  effectiveLoading: boolean;
  recentSearches: { query: string; timestamp: number }[];
  setQuery: (q: string) => void;
  removeRecentSearch: (q: string) => Promise<void>;
  clearRecentSearches: () => Promise<void>;
  isShowingDetail: boolean;
  toggleDetail: () => void;
};

function renderBody(p: RenderBodyProps) {
  if (!p.ycPath) return <MissingCliEmpty />;
  if (p.isUpdateError)
    return (
      <UpdateRequiredEmpty gate={p.updateGate} onRetry={p.revalidateGate} />
    );
  if (p.isAuthError) return <NotAuthedEmpty onRetry={p.revalidateGate} />;
  if (p.errorMessage) return <ErrorEmpty message={p.errorMessage} />;
  // Probe still resolving: render nothing (the List spinner covers it) so the
  // recent-searches list doesn't flash before a possible update-required gate.
  if (p.probePending && p.trimmed.length === 0) return null;

  if (p.trimmed.length === 0) {
    if (p.recentSearches.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Bookface"
          description="Type to search across people, companies, posts, deals, and more."
          actions={
            <ActionPanel>
              <Action.Push
                title="Update YC CLI"
                icon={Icon.Download}
                target={<UpdateYcCli />}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
            </ActionPanel>
          }
        />
      );
    }
    return (
      <List.Section title="Recent Searches">
        {p.recentSearches.map((r) => (
          <List.Item
            key={r.query}
            icon={Icon.Clock}
            title={r.query}
            accessories={[{ date: new Date(r.timestamp) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Search"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => p.setQuery(r.query)}
                />
                <Action
                  title="Remove from Recents"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => p.removeRecentSearch(r.query)}
                />
                <Action
                  title="Clear All Recents"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                  onAction={p.clearRecentSearches}
                />
                <Action.Push
                  title="Update YC CLI"
                  icon={Icon.Download}
                  target={<UpdateYcCli />}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  }

  if (p.items.length === 0 && !p.effectiveLoading) {
    const filterSuffix =
      p.filter !== ALL_FILTER ? ` in ${SEARCH_TYPE_LABELS[p.filter]}` : "";
    return (
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title="No results"
        description={`Nothing matched "${p.debouncedQuery}"${filterSuffix}.`}
      />
    );
  }

  return p.items.map((item) =>
    renderItem({
      item,
      isShowingDetail: p.isShowingDetail,
      toggleDetail: p.toggleDetail,
    }),
  );
}

function TypeDropdown({
  value,
  onChange,
  items,
}: {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  items: SearchItem[];
}) {
  const counts = useMemo(() => {
    const c: Partial<Record<SearchItemType, number>> = {};
    for (const item of items) c[item.type] = (c[item.type] ?? 0) + 1;
    return c;
  }, [items]);

  return (
    <List.Dropdown
      tooltip="Filter results by type"
      value={value}
      onChange={(v) => onChange(v as FilterValue)}
      storeValue
    >
      <List.Dropdown.Item
        icon={Icon.MagnifyingGlass}
        title={`All${items.length > 0 ? ` (${items.length})` : ""}`}
        value={ALL_FILTER}
      />
      <List.Dropdown.Section>
        {SEARCH_TYPE_ORDER.map((t) => {
          const count = counts[t] ?? 0;
          const label = SEARCH_TYPE_LABELS[t];
          return (
            <List.Dropdown.Item
              key={t}
              icon={SEARCH_TYPE_ICONS[t]}
              title={count > 0 ? `${label} (${count})` : label}
              value={t}
            />
          );
        })}
      </List.Dropdown.Section>
    </List.Dropdown>
  );
}
