import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import {
  EntryFilterActions,
  EntryMetadata,
  EntryOpenActions,
  Filter,
  formatDate,
  journalIcon,
  mediaLabel,
} from "./components/entry";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { logger } from "@chrismessina/raycast-logger";
import { NoJournalsEmptyView, SetupEmptyView } from "./components/setup-empty-view";
import { Entry, Journal, searchEntries, SearchHit } from "./lib/api";
import { ensureSearchModel, isSearchModelDownloaded, SEARCHES_BY_MEANING } from "./lib/cli";
import { failToast, onErrorToast, syncWithToast } from "./lib/feedback";
import { cleanBody } from "./lib/parse";
import { useAutoSync } from "./lib/use-auto-sync";
import { useRebuildNews } from "./lib/use-rebuild-news";
import { demoScoped, isDemo } from "./lib/demo";
import { useJournals } from "./lib/use-journals";

const ALL = "all";

const log = logger.child("[search]");

export default function Command() {
  const [searchText, setSearchText] = useState("");
  // Not remembered across launches: a controlled dropdown reports its first item on mount, which would overwrite a saved pick.
  const [journalId, setJournalId] = useState<string>(ALL);
  const [filter, setFilter] = useState<Filter | null>(null);
  const [showDetail, setShowDetail] = useCachedState<boolean>(demoScoped("show-detail-search"), true);
  const model = useSearchModel();
  const modelReady = model.status === "ready";

  const journals = useJournals();
  const journalsById = useMemo(() => new Map((journals.data ?? []).map((j) => [j.id, j])), [journals.data]);

  const results = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- only part of the cache key
    async (query: string, journal: string, tag: string, place: string, _demo: boolean) => {
      // A text search needs the model; the first one waits for the download already in flight.
      if (query.trim()) await ensureSearchModel();
      const started = performance.now();
      const hits = await searchEntries({
        query,
        journalIds: journal === ALL ? [] : [journal],
        tags: tag ? [tag] : [],
        places: place ? [place] : [],
        limit: 50,
      });
      // The query itself is never logged: it can be as private as the journal.
      log.debug("searched", {
        queryChars: query.trim().length,
        journal: journal === ALL ? "all" : "one",
        filter: tag ? "tag" : place ? "place" : "none",
        results: hits.length,
        ms: Math.round(performance.now() - started),
      });
      return hits;
    },
    [
      searchText,
      journalId,
      filter?.kind === "tag" ? filter.value : "",
      filter?.kind === "place" ? filter.value : "",
      isDemo(),
    ],
    {
      keepPreviousData: true,
      onError: onErrorToast("Search Failed"),
      execute: !journals.error && (modelReady || !searchText.trim()),
    },
  );

  const refresh = () => {
    if (model.status === "failed") model.retry();
    journals.revalidate();
    results.revalidate();
  };
  useRebuildNews();
  const autoSync = useAutoSync({
    ready: Boolean(journals.data) && !journals.error,
    empty: journals.data?.length === 0,
    onSynced: refresh,
  });

  const isSearching = Boolean(searchText.trim());
  // keepPreviousData would leave the last query's results under a failed new one, so any error replaces them.
  // A failed model download only blocks text searches; browsing by date still works without it.
  const modelError = isSearching && model.status === "failed" ? model.error : undefined;
  const error = journals.error ?? modelError ?? results.error;
  const hits = error ? [] : (results.data ?? []);

  const sync = async () => {
    if (await syncWithToast()) refresh();
  };

  const commonActions = (
    <ActionPanel.Section>
      {filter && <Action title="Clear Filter" icon={Icon.XMarkCircle} onAction={() => setFilter(null)} />}
      <Action
        title={showDetail ? "Hide Sidebar" : "Show Sidebar"}
        icon={Icon.AppWindowSidebarRight}
        shortcut={{
          macOS: { modifiers: ["cmd", "shift"], key: "d" },
          Windows: { modifiers: ["ctrl", "shift"], key: "d" },
        }}
        onAction={() => setShowDetail((v) => !v)}
      />
      <Action title="Sync Now" icon={Icon.ArrowClockwise} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={sync} />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={
        journals.isLoading || results.isLoading || autoSync.isSyncing || (isSearching && model.status === "downloading")
      }
      isShowingDetail={hits.length > 0 && showDetail}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={
        filter
          ? `Search ${filterLabel(filter)}…`
          : SEARCHES_BY_MEANING
            ? "Search entries by meaning…"
            : "Search entries…"
      }
      searchBarAccessory={
        <List.Dropdown tooltip="Journal" value={journalId} onChange={setJournalId}>
          <List.Dropdown.Item title="All Journals" value={ALL} icon={Icon.Book} />
          <List.Dropdown.Section>
            {(journals.data ?? []).map((j) => (
              <List.Dropdown.Item key={j.id} title={j.name} value={j.id} icon={journalIcon(j)} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {error ? (
        <SetupEmptyView error={error} onRetry={refresh} />
      ) : journals.data && journals.data.length === 0 ? (
        <NoJournalsEmptyView syncing={autoSync.isSyncing} onSynced={refresh} />
      ) : !results.isLoading && !autoSync.isSyncing && hits.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={isSearching || filter ? "No Matching Entries" : "No Entries Yet"}
          description={
            filter
              ? `Nothing matches in ${filterLabel(filter)}; clear the filter to search everything.`
              : isSearching
                ? "Try other words, or search all journals."
                : "Sync to download your newest entries."
          }
          actions={<ActionPanel>{commonActions}</ActionPanel>}
        />
      ) : (
        sections(hits, isSearching).map(({ title, items }) => (
          <List.Section
            key={title}
            title={filter && isSearching ? `${title} · ${filterLabel(filter)}` : title}
            subtitle={isSearching ? undefined : String(items.length)}
          >
            {items.map(({ entry }) => (
              <EntryItem
                key={entry.id}
                entry={entry}
                journal={journalsById.get(entry.journalId)}
                showDetail={showDetail}
                isSearching={isSearching}
                onFilter={setFilter}
                actions={commonActions}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}

type ModelState = { status: "ready" | "downloading" | "failed"; error?: unknown };

/** Downloads the search model once (about 90 MB) behind a toast, so the first search isn't a silent wait. */
function useSearchModel(): ModelState & { retry: () => void } {
  const [state, setState] = useState<ModelState>(() => ({
    status: isSearchModelDownloaded() ? "ready" : "downloading",
  }));
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);
  useEffect(() => {
    if (state.status !== "downloading" || started.current === attempt) return;
    started.current = attempt;
    (async () => {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Downloading Search Model…",
        message: "About 90 MB, one time only",
      });
      try {
        await ensureSearchModel();
        toast.style = Toast.Style.Success;
        toast.title = "Search Is Ready";
        toast.message = undefined;
        log.info("search model ready");
        setState({ status: "ready" });
      } catch (error) {
        await failToast(error, "Couldn't Download Search Model", toast);
        setState({ status: "failed", error });
      }
    })();
  }, [state.status, attempt]);
  return {
    ...state,
    retry: () => {
      setState({ status: "downloading" });
      setAttempt((n) => n + 1);
    },
  };
}

function filterLabel(filter: Filter): string {
  return filter.kind === "tag" ? `#${filter.value}` : filter.value;
}

function sections(hits: SearchHit[], isSearching: boolean): { title: string; items: SearchHit[] }[] {
  if (isSearching) return [{ title: "Best Matches", items: hits }];
  const groups = new Map<string, SearchHit[]>();
  for (const hit of hits) {
    const key = new Date(hit.entry.date).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    groups.set(key, [...(groups.get(key) ?? []), hit]);
  }
  return [...groups].map(([title, items]) => ({ title, items }));
}

function EntryItem(props: {
  entry: Entry;
  journal?: Journal;
  showDetail: boolean;
  isSearching: boolean;
  onFilter: (filter: Filter) => void;
  actions: ReactNode;
}) {
  const { entry, journal, showDetail, isSearching, onFilter } = props;
  // With the sidebar open a row has half the width, so the date is all digits ("11/9" in the US). Searches span years, so they keep the year.
  const date = formatDate(
    entry,
    isSearching ? { month: "short", year: "numeric" } : { month: showDetail ? "numeric" : "short", day: "numeric" },
  );
  const media = mediaLabel(entry);

  return (
    <List.Item
      title={entry.title}
      icon={journalIcon(journal)}
      accessories={[
        ...(entry.starred ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow }, tooltip: "Starred" }] : []),
        ...(media ? [{ icon: Icon.Image, tooltip: media }] : []),
        ...(showDetail ? [] : entry.tags.slice(0, 2).map((tag) => ({ tag }))),
        { text: date, tooltip: formatDate(entry, { dateStyle: "full", timeStyle: "short" }) },
      ]}
      detail={
        <List.Item.Detail
          markdown={cleanBody(entry.body) || "*This entry has no text.*"}
          metadata={<EntryMetadata entry={entry} journal={journal} M={List.Item.Detail.Metadata} />}
        />
      }
      actions={
        <ActionPanel title={entry.title}>
          <EntryOpenActions entry={entry} journal={journal} goTo onFilter={onFilter} />
          <EntryFilterActions entry={entry} onFilter={onFilter} />
          {props.actions}
        </ActionPanel>
      }
    />
  );
}
