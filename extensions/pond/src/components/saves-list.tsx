import { Action, ActionPanel, Icon, List, useNavigation } from "@raycast/api";
import { createDeeplink, useCachedPromise, useCachedState } from "@raycast/utils";
import type { ApiCursor, ApiLibraryQueryInput, ApiSave, ApiSearchRequest } from "pond-api";
import { type ReactNode, useMemo, useState } from "react";
import { pond } from "../api/client";
import { toError } from "../api/problems";
import { sectionsBySavedDay } from "../lib/display";
import { saveEditor } from "../lib/edits";
import { useQuickLook } from "../lib/files";
import { ALL_SAVES, decodeFilter, encodeFilter, type Filter, groupsByDay, queryFor } from "../lib/filters";
import { useLookups, useSources, useViews } from "../lib/library";
import { LIBRARY_LINK, searchLink } from "../lib/links";
import { uniqueById } from "../lib/pages";
import { recentlyOpened } from "../lib/recent";
import { thumbnailKey, useThumbnails } from "../lib/thumbnails";
import { FilterDropdown, filterTitle } from "./filter-dropdown";
import { ProblemView } from "./problem";
import { SaveItem } from "./save-item";

const PAGE_SIZE = 50;
const MEANING_LIMIT = 50;
const RECENT_PREFIX = "recent:";
const NONE: ApiSave[] = [];

/** Search by meaning narrows by source, folder and type only; other filters fall back to keywords. */
function meaningScope(filter: Filter): Omit<ApiSearchRequest, "query"> | null {
  switch (filter.kind) {
    case "all":
      return {};
    case "source":
      return { source: filter.source };
    case "folder":
      return { folderId: filter.id };
    case "media":
      return { kinds: filter.types };
    default:
      return null;
  }
}

function loadSaves(input: ApiLibraryQueryInput | null, meaning: ApiSearchRequest | null) {
  return async ({ cursor }: { cursor?: ApiCursor | null }) => {
    if (meaning) return { data: (await pond().search(meaning)).saves, hasMore: false };
    if (!input) return { data: NONE, hasMore: false };
    const page = await pond().query({ ...input, limit: PAGE_SIZE, cursor });
    return { data: page.saves ?? [], hasMore: page.nextCursor !== null, cursor: page.nextCursor };
  };
}

export interface SavesListProps {
  /** Pins the list to one filter and hides the dropdown. */
  filter?: Filter;
  navigationTitle?: string;
  searchText?: string;
}

export function SavesList({ filter: pinned, navigationTitle, searchText: initialText = "" }: SavesListProps) {
  const { push } = useNavigation();
  const [searchText, setSearchText] = useState(initialText);
  const [stored, setStored] = useCachedState("filter", encodeFilter(ALL_SAVES));
  const [byMeaning, setByMeaning] = useCachedState("by-meaning", false);
  const [showingDetail, setShowingDetail] = useCachedState("show-detail", true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const lookups = useLookups();
  const views = useViews();
  const sources = useSources();

  const filter = pinned ?? decodeFilter(stored);
  const keywords = searchText.trim();
  const scope = meaningScope(filter);
  const meaning = byMeaning && keywords && scope ? { ...scope, query: keywords, limit: MEANING_LIMIT } : null;
  const input = queryFor(filter, keywords, views.data);

  const saves = useCachedPromise(loadSaves, [input, meaning], {
    keepPreviousData: true,
    execute: input !== null || meaning !== null,
  });
  const showRecents = !pinned && filter.kind === "all" && !keywords;
  const recents = useCachedPromise(recentlyOpened, [], { execute: showRecents, onError: () => undefined });
  const recentSaves = (showRecents && recents.data) || NONE;
  const data = useMemo(() => uniqueById(saves.data ?? NONE), [saves.data]);

  const all = useMemo(() => [...recentSaves, ...data], [recentSaves, data]);
  const icons = useThumbnails(all, "small");
  const selected = selectedId?.startsWith(RECENT_PREFIX)
    ? recentSaves.find((save) => `${RECENT_PREFIX}${save.id}` === selectedId)
    : (data.find((save) => save.id === selectedId) ?? data[0]);
  const previews = useThumbnails(
    useMemo(() => (selected ? [selected] : []), [selected]),
    "medium",
  );
  const quickLook = useQuickLook(selected);

  const inTrash = filter.kind === "trash";
  const editor = useMemo(() => saveEditor(saves.mutate, { inTrash }), [saves.mutate, inTrash]);
  const recentEditor = useMemo(() => saveEditor(recents.mutate), [recents.mutate]);

  function refresh() {
    saves.revalidate();
    if (showRecents) recents.revalidate();
    lookups.revalidate();
    views.revalidate();
    sources.revalidate();
  }

  function applyFilter(next: Filter) {
    if (pinned) return push(<SavesList filter={next} navigationTitle={filterTitle(next, lookups, views.data)} />);
    setStored(encodeFilter(next));
  }

  const sections = meaning
    ? [{ title: "Best Matches", items: data }]
    : input && groupsByDay(input)
      ? sectionsBySavedDay(data, new Date())
      : [{ title: filterTitle(filter, lookups, views.data), items: data }];

  const searchActions = (
    <>
      {scope && (
        <Action
          title={byMeaning ? "Search by Keywords" : "Search by Meaning"}
          icon={byMeaning ? Icon.Text : Icon.Stars}
          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
          onAction={() => setByMeaning(!byMeaning)}
        />
      )}
      {keywords && (
        <Action.Open title="Open Search in Pond" icon={Icon.MagnifyingGlass} target={searchLink(keywords)} />
      )}
      {keywords && (
        <Action.CreateQuicklink
          title="Create Quicklink for Search"
          quicklink={{
            name: `Search Pond for ${keywords}`,
            link: createDeeplink({ command: "search-saves", fallbackText: keywords }),
          }}
        />
      )}
    </>
  );

  function item(save: ApiSave, recent: boolean) {
    const id = recent ? `${RECENT_PREFIX}${save.id}` : save.id;
    const isSelected = selected?.id === save.id;
    return (
      <SaveItem
        key={id}
        id={id}
        save={save}
        editor={recent ? recentEditor : editor}
        lookups={lookups}
        icons={icons}
        preview={isSelected ? previews.get(thumbnailKey(save)) : undefined}
        quickLook={isSelected ? quickLook : undefined}
        showingDetail={showingDetail}
        onToggleDetail={() => setShowingDetail(!showingDetail)}
        onRefresh={refresh}
        onFilter={applyFilter}
        actions={searchActions}
      />
    );
  }

  const placeholder = meaning || (byMeaning && scope) ? "Search by meaning…" : "Search saves…";
  const failed = saves.error && !data.length ? toError(saves.error) : null;

  return (
    <List
      navigationTitle={navigationTitle}
      isLoading={saves.isLoading || (input === null && views.isLoading)}
      isShowingDetail={showingDetail && all.length > 0 && !failed}
      filtering={false}
      throttle
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={placeholder}
      pagination={saves.pagination}
      onSelectionChange={setSelectedId}
      searchBarAccessory={
        pinned ? undefined : (
          <FilterDropdown
            value={encodeFilter(filter)}
            onChange={setStored}
            lookups={lookups}
            views={views.data ?? []}
            sources={sources.data ?? []}
          />
        )
      }
    >
      {failed ? (
        <ProblemView error={failed} onRetry={refresh} />
      ) : (
        <List.EmptyView
          icon={inTrash ? Icon.Trash : Icon.MagnifyingGlass}
          title={keywords ? "No results found" : inTrash ? "Trash is empty" : "No saves here"}
          description={
            keywords && !byMeaning && scope
              ? "Try other words, or press ⌘⇧B to search by meaning."
              : "Save a link with Save URL, or change the filter."
          }
          actions={<EmptyActions onRefresh={refresh}>{searchActions}</EmptyActions>}
        />
      )}
      {recentSaves.length > 0 && (
        <List.Section title="Recently Opened">{recentSaves.map((save) => item(save, true))}</List.Section>
      )}
      {sections.map((section) => (
        <List.Section key={section.title} title={section.title}>
          {section.items.map((save) => item(save, false))}
        </List.Section>
      ))}
    </List>
  );
}

function EmptyActions({ onRefresh, children }: { onRefresh: () => void; children: ReactNode }) {
  return (
    <ActionPanel>
      {children}
      <Action.Open title="Open Pond" icon={Icon.AppWindow} target={LIBRARY_LINK} />
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={onRefresh} />
    </ActionPanel>
  );
}
