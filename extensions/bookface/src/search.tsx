import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { renderItem } from "./lib/items";
import {
  NotAuthedError,
  isUnauthedMessage,
  parseYcJson,
  resolveYcPath,
} from "./lib/yc";
import {
  MissingCliEmpty,
  NotAuthedEmpty,
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

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  } = useRecentSearches(RECENT_SEARCHES_KEY);

  const trimmed = query.trim();
  const shouldRun = debouncedQuery.length > 0 && ycPath !== null;

  const { isLoading, data, error } = useExec<SearchResponse>(
    ycPath ?? "yc",
    ["search", debouncedQuery, "--json"],
    {
      execute: shouldRun,
      parseOutput: ({ stdout }) => {
        if (!stdout || !stdout.trim()) return { items: [] };
        return parseYcJson<SearchResponse>(stdout);
      },
      keepPreviousData: true,
      onData: () => {
        if (debouncedQuery) void addRecentSearch(debouncedQuery);
      },
    },
  );

  const items = useMemo(() => {
    const all = data?.items ?? [];
    const ordered = [...all].sort((a, b) => {
      const ai = SEARCH_TYPE_ORDER.indexOf(a.type);
      const bi = SEARCH_TYPE_ORDER.indexOf(b.type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
    if (filter === ALL_FILTER) return ordered;
    return ordered.filter((i) => i.type === filter);
  }, [data, filter]);

  const isAuthError =
    error instanceof NotAuthedError ||
    (error instanceof Error && isUnauthedMessage(error.message));
  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  const isDebouncing = trimmed !== debouncedQuery;
  const effectiveLoading = isLoading || isDebouncing;

  return (
    <List
      isLoading={effectiveLoading}
      isShowingDetail={isShowingDetail && items.length > 0}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Bookface for people, companies, posts…"
      searchBarAccessory={
        <TypeDropdown
          value={filter}
          onChange={setFilter}
          items={data?.items ?? []}
        />
      }
    >
      {renderBody({
        ycPath,
        errorMessage,
        isAuthError,
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
  );
}

type RenderBodyProps = {
  ycPath: string | null;
  errorMessage: string | null;
  isAuthError: boolean;
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
  if (p.isAuthError) return <NotAuthedEmpty />;
  if (p.errorMessage) return <ErrorEmpty message={p.errorMessage} />;

  if (p.trimmed.length === 0) {
    if (p.recentSearches.length === 0) {
      return (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Bookface"
          description="Type to search across people, companies, posts, deals, and more."
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
