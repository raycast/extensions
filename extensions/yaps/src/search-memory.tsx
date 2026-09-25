import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useCallback, useRef, useState } from "react";
import { NoteActions } from "./components/note-detail";
import { runAction } from "./lib/action";
import { displaySource, previewMarkdown } from "./lib/format";
import type { VaultNote, VaultSearchHit } from "./lib/types";
import { openYapsWithFallback } from "./lib/yaps-app";
import { listNotes, searchNotes } from "./lib/yaps-cli";

type SearchItem = { type: "note"; note: VaultNote } | { type: "hit"; hit: VaultSearchHit };

async function loadResults(query: string, signal?: AbortSignal): Promise<SearchItem[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return (await listNotes(40, signal)).map((note) => ({ type: "note", note }));
  }
  const result = await searchNotes(trimmed, 30, signal);
  return result.hits.map((hit) => ({ type: "hit", hit }));
}

export default function SearchMemoryCommand() {
  const [searchText, setSearchText] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const loadResultsWithAbort = useCallback(
    (query: string) => loadResults(query, abortable.current?.signal),
    [],
  );
  const { data, error, isLoading, revalidate } = usePromise(loadResultsWithAbort, [searchText], {
    abortable,
    failureToastOptions: {
      title: "Could not search Yaps Memory",
    },
  });
  const query = searchText.trim();
  const hasResults = Boolean(data?.length);
  const hasError = Boolean(error);
  const shouldShowEmptyView = hasError || (!isLoading && !hasResults);

  const emptyState = error
    ? {
        icon: Icon.Warning,
        title: "Yaps Memory is unavailable",
        description: `${conciseError(error)} Try again, or open preferences if the CLI path needs attention.`,
      }
    : query
      ? {
          icon: Icon.MagnifyingGlass,
          title: "No matching notes",
          description:
            "Try a different word or phrase. Search runs only against your local Yaps vault.",
        }
      : {
          icon: Icon.Document,
          title: "No notes yet",
          description:
            "Capture a thought in Yaps, then return here. Your private memory stays on this Mac.",
        };

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search your private Yaps memory…"
      onSearchTextChange={setSearchText}
      filtering={false}
      throttle
    >
      {shouldShowEmptyView ? (
        <List.EmptyView
          icon={emptyState.icon}
          title={emptyState.title}
          description={emptyState.description}
          actions={
            <ActionPanel>
              {error ? (
                <Action
                  title="Try Again"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
              ) : null}
              <Action
                title="Open Yaps"
                icon={Icon.AppWindow}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => runAction("Could not open Yaps", openYapsWithFallback)}
              />
              <Action
                title="Configure CLI Path"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      ) : null}
      {!hasError && data && data.length > 0 ? (
        <List.Section
          title={query ? "Search results" : "Recent notes"}
          subtitle={`${data.length} ${data.length === 1 ? "note" : "notes"}`}
        >
          {data.map((item) =>
            item.type === "note" ? (
              <RecentNoteItem key={item.note.id} note={item.note} />
            ) : (
              <SearchHitItem key={item.hit.note_id} hit={item.hit} />
            ),
          )}
        </List.Section>
      ) : null}
    </List>
  );
}

function RecentNoteItem({ note }: { note: VaultNote }) {
  const accessories: List.Item.Accessory[] = [];
  if (note.pinned) {
    accessories.push({ icon: { source: Icon.Pin, tintColor: Color.Orange }, tooltip: "Pinned" });
  }
  const updatedAt = new Date(note.updated_at);
  if (!Number.isNaN(updatedAt.getTime())) {
    accessories.push({ date: updatedAt, tooltip: "Last updated" });
  }

  return (
    <List.Item
      id={note.id}
      icon={iconForSource(note.source)}
      title={note.title}
      subtitle={{ value: note.path, tooltip: "Vault path" }}
      keywords={[note.path, ...note.tags, ...note.aliases]}
      accessories={accessories}
      detail={
        <List.Item.Detail
          markdown={previewMarkdown(note.markdown)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Location"
                text={note.path}
                icon={Icon.Folder}
              />
              <List.Item.Detail.Metadata.Label
                title="Source"
                text={displaySource(note.source)}
                icon={iconForSource(note.source)}
              />
              <List.Item.Detail.Metadata.Label
                title="Updated"
                text={formatTimestamp(note.updated_at)}
                icon={Icon.Clock}
              />
              <List.Item.Detail.Metadata.Label
                title="Privacy"
                text="Stored locally on this Mac"
                icon={Icon.Lock}
              />
              {note.tags.length > 0 ? (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {note.tags.map((tag) => (
                    <List.Item.Detail.Metadata.TagList.Item key={tag} text={tag} />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <NoteActions
          path={note.path}
          title={note.title}
          markdown={note.markdown}
          includeViewAction
        />
      }
    />
  );
}

function SearchHitItem({ hit }: { hit: VaultSearchHit }) {
  return (
    <List.Item
      id={hit.note_id}
      icon={Icon.Document}
      title={hit.title}
      subtitle={{ value: hit.path, tooltip: "Vault path" }}
      keywords={[hit.path, hit.title]}
      detail={
        <List.Item.Detail
          markdown={`# ${hit.title}\n\n${previewMarkdown(hit.snippet)}`}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Location"
                text={hit.path}
                icon={Icon.Folder}
              />
              <List.Item.Detail.Metadata.Label
                title="Match"
                text="Found in your local vault"
                icon={Icon.MagnifyingGlass}
              />
              <List.Item.Detail.Metadata.Label
                title="Privacy"
                text="Stored locally on this Mac"
                icon={Icon.Lock}
              />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<NoteActions path={hit.path} title={hit.title} includeViewAction />}
    />
  );
}

function iconForSource(source: string): Icon {
  switch (source) {
    case "voice":
      return Icon.Microphone;
    case "meeting":
      return Icon.TwoPeople;
    case "quick_capture":
      return Icon.Download;
    case "daily":
      return Icon.Calendar;
    default:
      return Icon.Document;
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

function conciseError(error: unknown): string {
  if (!(error instanceof Error) || !error.message.trim()) {
    return "Yaps could not read the vault right now.";
  }
  const message = error.message.replace(/\s+/g, " ").trim();
  return message.length <= 240 ? message : `${message.slice(0, 239).trimEnd()}…`;
}
