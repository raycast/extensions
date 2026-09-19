// Command: Search Etymology.
//
// The list carries a live preview, so a word's ancestry is visible while you
// arrow past it rather than only after you commit to it. Exactly one entry is
// ever in flight: the fetch is hoisted here and keyed on a debounced selection,
// because a detail rendered per row would fetch every row the cursor touches.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Action, ActionPanel, Icon, Keyboard, List, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { EtymNode } from "./model";
import { loadPreview } from "./entry";
import { earliest, entryMarkdown, relationKey } from "./render";
import { pageUrl, suggest } from "./sources";
import { useDebouncedValue } from "./hooks";
import { EntryDetail } from "./components/EntryDetail";
import * as favorites from "./favorites";

interface Row {
  id: string;
  term: string;
  lang: string;
  subtitle?: string;
  icon: Icon;
}

export default function Command() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pinned, setPinned] = useState<favorites.Favorite[]>([]);

  const refreshPinned = useCallback(() => {
    favorites.list().then(setPinned);
  }, []);

  useEffect(refreshPinned, [refreshPinned]);

  const trimmed = query.trim();
  const browsing = trimmed.length === 0;

  const { data: results, isLoading: isSearching } = useCachedPromise(suggest, [trimmed], {
    keepPreviousData: true,
    execute: !browsing,
  });

  const rows: Row[] = useMemo(
    () =>
      browsing
        ? pinned.map((f) => ({
            id: `${f.lang}:${f.term}`,
            term: f.term,
            lang: f.lang,
            subtitle: f.langName || undefined,
            icon: Icon.Star,
          }))
        : (results ?? []).map((r) => ({
            id: `en:${r.title}`,
            term: r.title,
            lang: "en",
            subtitle: r.description,
            icon: Icon.Book,
          })),
    [browsing, pinned, results],
  );

  // Raycast does not report a selection until the user moves, so fall back to the
  // first row: the preview should be populated the moment results land.
  const active = rows.find((r) => r.id === selectedId) ?? rows[0];
  const settled = useDebouncedValue(active?.id, 220);
  const target = rows.find((r) => r.id === settled);

  const {
    data: entry,
    isLoading: isPreviewing,
    error,
  } = useCachedPromise(loadPreview, [target?.term ?? "", target?.lang ?? "en"], {
    execute: Boolean(target),
    keepPreviousData: false,
  });

  const view = getPreferenceValues<Preferences>().defaultView;

  function detailFor(row: Row) {
    if (row.id !== target?.id) return <List.Item.Detail markdown="" />;

    if (error) {
      return <List.Item.Detail markdown={`Could not reach Wiktionary.\n\n${error.message}`} />;
    }
    if (!entry) return <List.Item.Detail isLoading />;

    const tree = entry.sections.find((s) => s.tree)?.tree;
    const oldest = tree ? earliest(tree) : undefined;

    return (
      <List.Item.Detail
        isLoading={isPreviewing}
        markdown={entryMarkdown(entry, view)}
        metadata={
          <List.Item.Detail.Metadata>
            <List.Item.Detail.Metadata.Label title="Language" text={entry.langName} />
            {oldest && <List.Item.Detail.Metadata.Label title="Earliest" text={`${oldest.langName} ${oldest.term}`} />}
            <RelationKey tree={tree} />
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Link title="Source" target={entry.pageUrl} text="Wiktionary" />
          </List.Item.Detail.Metadata>
        }
      />
    );
  }

  return (
    <List
      isLoading={isSearching}
      isShowingDetail={rows.length > 0}
      onSearchTextChange={setQuery}
      onSelectionChange={setSelectedId}
      selectedItemId={selectedId ?? undefined}
      searchBarPlaceholder="Search a word"
      throttle
    >
      <List.Section title={browsing ? "Pinned" : "Wiktionary"}>
        {rows.map((row) => (
          <List.Item
            key={row.id}
            id={row.id}
            title={row.term}
            subtitle={row.subtitle}
            icon={row.icon}
            detail={detailFor(row)}
            actions={<Actions term={row.term} lang={row.lang} onPop={refreshPinned} />}
          />
        ))}
      </List.Section>

      <List.EmptyView
        icon={browsing ? Icon.Star : Icon.MagnifyingGlass}
        title={browsing ? "Search a word" : "Nothing on Wiktionary"}
        description={
          browsing ? "Type above, or pin words from an entry to keep them here." : `No entry matches “${trimmed}”.`
        }
      />
    </List>
  );
}

function RelationKey({ tree }: { tree?: EtymNode }) {
  const entries = tree ? relationKey(tree) : [];
  if (entries.length === 0) return null;

  return (
    <List.Item.Detail.Metadata.TagList title="Key">
      {entries.map((entry) => (
        <List.Item.Detail.Metadata.TagList.Item key={entry} text={entry} />
      ))}
    </List.Item.Detail.Metadata.TagList>
  );
}

function Actions({ term, lang, onPop }: { term: string; lang: string; onPop: () => void }) {
  return (
    <ActionPanel>
      {/* Pinning happens inside the pushed entry, so the list has to re-read
          storage on the way back; otherwise it redraws yesterday's pins. */}
      <Action.Push
        title="Show Etymology"
        icon={Icon.Tree}
        target={<EntryDetail term={term} lang={lang} />}
        onPop={onPop}
      />
      <Action.OpenInBrowser title="Open in Wiktionary" url={pageUrl(term)} shortcut={Keyboard.Shortcut.Common.Open} />
    </ActionPanel>
  );
}
