import { ReactNode, useEffect, useRef, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, useCachedState } from "@raycast/utils";
import { callTool } from "../lib/cosign-mcp";
import { showReadFailure } from "../lib/errors";
import type { FavoriteKind } from "../lib/favorites";
import { listDetailMetadata } from "../lib/meta";
import { useRecentSearches } from "../lib/recents";
import type { Content } from "./entities";
import { useFavorites } from "./favorite";
import { EntityRow } from "./rows";
import { useDescriptionOnly, ViewSection } from "./view-actions";

export interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  verified?: boolean;
  url: string;
  /** Extra text the list filter matches against. */
  keywords?: string[];
}

/**
 * Enter-to-search list. Search is explicit (not per keystroke) because Cosign's search tools are rate limited.
 * After a search the bar clears and the results stay on screen, so typing filters them; the first row always
 * offers a fresh search for whatever is typed.
 * The selected row's full record loads once (debounced) and feeds both the sidebar and the action panel.
 */
export default function SearchList<Result, Detail>(props: {
  tool: string;
  noun: [singular: string, plural: string];
  /** Which favorites list result ids belong to (shows a star on favorited rows). */
  favoriteKind: FavoriteKind;
  /** Key under which this command keeps its recent searches. */
  recentsKey: string;
  placeholder: string;
  reason: string;
  emptyDescription: string;
  /** Extra tool arguments for a query (defaults to `{ query }`). */
  args?: (query: string, cursor: string | null) => Record<string, unknown>;
  /** Pull the next-page cursor out of the tool response. Enables an explicit "Load More" row. */
  nextCursor?: (raw: never) => string | null;
  /** Total ranked results the server reports for the query (enables "N of M" counts). */
  total?: (raw: never) => number | null;
  /** Results per page, used for the "Load N More" label. */
  pageSize?: number;
  /** Pull the result array out of the tool response (defaults to the response itself). */
  results?: (raw: never) => Result[];
  toItem: (result: Result) => SearchItem;
  fetchDetail: (id: string) => Promise<Detail>;
  content: (detail: Detail) => Content;
  actions: (detail: Detail) => ReactNode;
}) {
  const { tool, noun, favoriteKind, recentsKey, placeholder, reason, emptyDescription, toItem } = props;
  const { fetchDetail, content, actions } = props;
  const [text, setText] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [searched, setSearched] = useState<string>();
  const [cursor, setCursor] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [debounced, setDebounced] = useState<string | null>(null);
  const { data: favorites } = useFavorites();
  const starred = new Set(favorites?.[favoriteKind].map((f) => f.id));
  const [showDetail, setShowDetail] = useCachedState("show-detail", true);
  // Description mode hands the whole pane to the markdown by dropping the metadata table.
  const { descriptionOnly, toggleDescriptionOnly } = useDescriptionOnly();
  const recent = useRecentSearches(recentsKey);
  // Each new search supersedes the last; a slower, older response must not overwrite the newer one.
  const generation = useRef(0);

  // Arrowing through rows must not fire one lookup per row.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(selected), 250);
    return () => clearTimeout(timer);
  }, [selected]);

  const query = text.trim();
  const selectedIsResult = items.some((i) => i.id === selected);

  const {
    data: detail,
    isLoading: isLoadingDetail,
    error: detailError,
  } = useCachedPromise(fetchDetail, [debounced ?? ""], {
    onError: showReadFailure("Couldn't load profile"),
    execute: !!debounced && items.some((i) => i.id === debounced),
  });

  async function search(q: string, after: string | null = null) {
    if (after && isSearching) return;
    const mine = after ? generation.current : ++generation.current;
    setIsSearching(true);
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: after ? "Loading more results…" : "Searching Cosign…",
    });
    try {
      const raw = await callTool<never>(tool, {
        ...(props.args?.(q, after) ?? { query: q }),
        reason_for_call: reason,
      });
      if (mine !== generation.current) return;
      const results = (props.results ? props.results(raw) : (raw as Result[])).map(toItem);
      const nextTotal = props.total?.(raw) ?? null;
      setCursor(props.nextCursor?.(raw) ?? null);
      setTotal(nextTotal);
      let shown = results.length;
      if (after) {
        const merged = [...items, ...results.filter((r) => !items.some((p) => p.id === r.id))];
        shown = merged.length;
        setItems(merged);
      } else {
        setItems(results);
        setSearched(q);
        setText((t) => (t.trim() === q ? "" : t));
        await recent.add(q);
      }
      toast.style = Toast.Style.Success;
      toast.primaryAction = undefined;
      const label = shown === 1 ? noun[0] : noun[1];
      const added = after ? shown - items.length : shown;
      toast.title = !added
        ? after
          ? `No more ${noun[1]}.`
          : `No ${noun[1]} found.`
        : nextTotal && nextTotal > shown
          ? `Showing ${shown} of ${nextTotal} ${label}`
          : `${shown} ${label}`;
    } catch (error) {
      if (mine !== generation.current) return;
      toast.style = Toast.Style.Failure;
      const message = error instanceof Error ? error.message : String(error);
      toast.title = "Cosign search failed";
      toast.message = message;
      toast.primaryAction = { title: "Copy Error", onAction: () => Clipboard.copy(message) };
    } finally {
      if (mine === generation.current) setIsSearching(false);
    }
  }

  const remaining = total ? Math.max(total - items.length, 0) : null;
  const next = props.pageSize && remaining ? Math.min(props.pageSize, remaining) : null;
  const loadMoreTitle = next ? `Load ${next} More` : "Load More Results";

  const browserSearch = searched ? (
    <Action.OpenInBrowser
      title="Open Search in Browser"
      url={`https://cosign.co/search?q=${encodeURIComponent(searched)}`}
    />
  ) : null;

  return (
    <List
      isLoading={isSearching || recent.isLoading}
      searchText={text}
      onSearchTextChange={setText}
      searchBarPlaceholder={items.length ? "Filter results, or type a new search and press Enter" : placeholder}
      filtering={items.length > 0}
      isShowingDetail={showDetail && selectedIsResult}
      onSelectionChange={setSelected}
    >
      {query ? (
        <List.Item
          id="search"
          icon={Icon.MagnifyingGlass}
          title={`Search Cosign for “${query}”`}
          keywords={[query]}
          actions={
            <ActionPanel>
              <Action title="Search" onAction={() => search(query)} />
            </ActionPanel>
          }
        />
      ) : null}
      <List.Section
        title={searched ? `Results for “${searched}”` : undefined}
        subtitle={searched && total ? `${items.length} of ${total}` : undefined}
      >
        {items.map((item) => {
          const isSelected = item.id === debounced;
          const body = isSelected && detail ? content(detail) : undefined;
          return (
            <EntityRow
              key={item.id}
              kind={favoriteKind}
              id={item.id}
              name={item.title}
              imageUrl={item.imageUrl}
              subtitle={showDetail ? undefined : item.subtitle}
              verified={item.verified}
              starred={starred.has(item.id)}
              keywords={item.keywords}
              detail={
                <List.Item.Detail
                  isLoading={isSelected && isLoadingDetail}
                  markdown={
                    body?.markdown ??
                    (isSelected ? (detailError ? "Couldn’t load this profile." : "Loading profile…") : undefined)
                  }
                  metadata={body && !descriptionOnly ? listDetailMetadata(body.meta) : undefined}
                />
              }
              actions={
                <ActionPanel>
                  {isSelected && detail ? actions(detail) : <Action.OpenInBrowser url={item.url} />}
                  {browserSearch ? <ActionPanel.Section>{browserSearch}</ActionPanel.Section> : null}
                  <ViewSection
                    descriptionOnly={descriptionOnly}
                    onToggleDescription={toggleDescriptionOnly}
                    sidebar={{ shown: showDetail, onToggle: () => setShowDetail((v) => !v) }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
        {cursor && searched ? (
          <List.Item
            id="load-more"
            icon={Icon.ArrowDownCircle}
            title={loadMoreTitle}
            accessories={total ? [{ text: `${Math.max(total - items.length, 0)} remaining` }] : undefined}
            keywords={["more"]}
            actions={
              <ActionPanel>
                <Action title={loadMoreTitle} onAction={() => search(searched, cursor)} />
                {browserSearch}
              </ActionPanel>
            }
          />
        ) : null}
      </List.Section>
      {!items.length && recent.recents.length ? (
        <List.Section title="Recent Searches">
          {recent.recents.map((r) => (
            <List.Item
              key={`recent:${r.query}`}
              id={`recent:${r.query}`}
              icon={Icon.Clock}
              title={r.query}
              subtitle={new Date(r.timestamp).toLocaleDateString()}
              actions={
                <ActionPanel>
                  <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => search(r.query)} />
                  <Action
                    title="Remove Recent Search"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    onAction={() => recent.remove(r.query)}
                  />
                  <Action
                    title="Clear Recent Searches"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.RemoveAll}
                    onAction={async () => {
                      const confirmed = await confirmAlert({
                        title: "Clear Recent Searches?",
                        message: "This removes every recent search for this command.",
                        primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
                      });
                      if (confirmed) await recent.clear();
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
      {!items.length && !recent.recents.length && !query ? (
        <List.EmptyView title="Search Cosign" description={emptyDescription} />
      ) : null}
    </List>
  );
}
