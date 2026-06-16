// Search Entries — the first Raycast command for List by FullForms.
//
// Flow:
//   1. On mount, fetch /api/v1/workspaces so the dropdown can list
//      "All workspaces" plus one item per workspace the caller
//      belongs to. The dropdown is hidden for single-workspace users
//      so the chrome stays minimal (their "All workspaces" and "their
//      one workspace" are the same set).
//   2. On every search-text change, fetch /api/v1/search with the
//      current query and the active workspace selection. The sentinel
//      value "all" omits workspace_id from the URL; the server-side
//      api_search_for_token RPC (migration 20260531000000) treats a
//      missing workspace_id as "search across every workspace the
//      caller is a member of", membership-scoped via a
//      workspace_members join. Raycast's useFetch handles debouncing
//      + cancellation via `throttle`.
//   3. Results render in two sections (Entries / Lists). Within
//      Entries, rows are grouped by their parent list under a
//      <List.Section> header (migration 20260601000000 widened the
//      response to include workspaceName per row so cross-workspace
//      results with same-named lists disambiguate via the header,
//      "Glossary · FullForms" vs "Glossary · Personal"). Each row
//      shows term + definition + a list-coloured icon; the list
//      name lives in the section header rather than the per-row
//      accessory.
//   4. Enter on an entry opens its list page with the hash routing
//      to the entry detail modal; Enter on a list opens the list
//      page.
//
// Detail-view toggle (Cmd+I, default ON): the panel opens with a
// markdown preview of the selected entry on the right side — term +
// type chip + short definition + long-form description, with the
// list name + visibility + workspace name + tags in the metadata
// panel beneath. The detail pane is the higher-information view
// (most users want to see the description on every search), so we
// lead with it; press Cmd+I to flip to the compact-only layout
// when scanning a long result set. Backed by migration
// 20260602000000 which adds `description` (mention-token-stripped)
// and `type` to each entry row in the search response; tags arrive
// via migration 20260605000000 as `tags text[]` (empty array when
// none) and render as a TagList only when non-empty; visibility
// arrives via migration 20260606000000 via the listVisibility
// helper in src/lib/listIconCatalog.ts (mirrored from
// app/utils/listVisibility.js in the web app).
//
// TTS actions (Cmd+T / Cmd+Shift+T / Cmd+Opt+T on an entry row)
// route through src/lib/tts.ts — Cmd+T speaks term + definition +
// description (composeSpeakable joins them with [[slnc N]] pauses),
// Cmd+Shift+T speaks just the definition, Cmd+Opt+T stops any in-
// flight playback. See that module's header for the rate / voice /
// shutdown-handler story.

import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { apiBase, apiFetch, apiHost, authHeaders } from "./lib/api";
import type { WorkspacesResponse } from "./lib/api";
import { iconForList, listVisibility } from "./lib/listIconCatalog";
import { composeSpeakable, speakText, stopSpeaking } from "./lib/tts";

const ALL_WORKSPACES = "all";

// The Speak actions shell out to macOS's `say` binary (see
// src/lib/tts.ts), which doesn't exist on Windows. The extension
// ships for both platforms, so the TTS actions are gated to macOS
// and simply don't render elsewhere. Everything else in this
// command is cross-platform.
const isMacOS = process.platform === "darwin";

// Display labels for the entry `type` enum. Kept local because
// this is the only command that surfaces a per-entry type label;
// other commands either show the raw enum (Quick Add Entry's
// dropdown items are labelled inside their TYPES array) or don't
// surface the type at all.
const TYPE_LABELS: Record<string, string> = {
  term: "Term",
  abbreviation: "Abbreviation",
  word: "Word",
  name: "Name",
};

interface SearchListResult {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  isPublic: boolean;
  workspaceId: number;
  workspaceName: string;
  workspaceType: string;
}

interface SearchEntryResult {
  id: number;
  entry: string;
  definition: string;
  description: string;
  type: string;
  listId: number;
  listName: string;
  listIcon: string | null;
  listColor: string | null;
  listIsPublic: boolean;
  workspaceId: number;
  workspaceName: string;
  workspaceType: string;
  myNote: string | null;
  isStarred: boolean;
  tags: string[];
}

interface SearchResponse {
  lists: SearchListResult[];
  entries: SearchEntryResult[];
}

interface ListBucket {
  listId: number;
  listName: string;
  listIcon: string | null;
  listColor: string | null;
  workspaceName: string;
  entries: SearchEntryResult[];
}

// Build the row-accessory array for an entry: a filled amber star
// when the user has starred the entry, a document icon when they've
// written a private note. Both render to the right of the row in
// compact mode AND in detail mode (Raycast renders accessories
// regardless of isShowingDetail), giving quick scan-time signals for
// "I've already engaged with this entry". Tooltips on each accessory
// make them discoverable without forcing a hover lookup. Returns
// undefined when neither signal is on, so accessories are absent
// from the row entirely (Raycast collapses the column width).
function accessoriesForEntry(entry: SearchEntryResult) {
  const items: {
    icon: { source: Icon; tintColor?: string };
    tooltip: string;
  }[] = [];
  if (entry.isStarred) {
    items.push({
      icon: { source: Icon.Star, tintColor: "#f59e0b" },
      tooltip: "Starred",
    });
  }
  if (entry.myNote && entry.myNote.trim()) {
    items.push({
      icon: { source: Icon.Document },
      tooltip: "You have a private note",
    });
  }
  return items.length > 0 ? items : undefined;
}

// Compose the detail markdown for an entry: H2 term, type+definition
// line, then the long-form description (if any), then the caller's
// private note (if any) under a "Your note" header. Plain markdown so
// Raycast renders it natively — callout prefixes like "> Example: …"
// render as visual blockquotes for free, since the on-disk format
// is already markdown-style. Mention links were stripped server-side
// (migration 20260602000000) so links to "#123" don't sneak in. The
// note section is added last because it's the most caller-specific
// piece — the entry's own content above is shared with every reader
// of the list, the note is yours alone.
function entryDetailMarkdown(entry: SearchEntryResult): string {
  const lines: string[] = [];
  // Star glyph rides alongside the term in the H2 when starred, so
  // the visual signal sits at the top of the detail pane (mirroring
  // the star button at the top-right of the web's entry detail
  // modal) — replaces the previous "Starred: Yes" metadata row which
  // read as dry metadata rather than a status indicator.
  lines.push(`## ${entry.entry}${entry.isStarred ? " ⭐" : ""}`);
  lines.push("");
  if (entry.definition) {
    lines.push(entry.definition);
  }
  if (entry.description && entry.description.trim()) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push(entry.description);
  }
  if (entry.myNote && entry.myNote.trim()) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("### Your note");
    lines.push("");
    lines.push(entry.myNote);
  }
  return lines.join("\n");
}

export default function SearchCommand() {
  const [query, setQuery] = useState("");
  const [workspaceId, setWorkspaceId] = useState<string>(ALL_WORKSPACES);
  const [showingDetail, setShowingDetail] = useState(true);

  // Auto-stop any in-flight TTS when the Search Entries view
  // unmounts (user pressed Esc / Cmd+W / switched to another
  // command). macOS doesn't reliably propagate the Node parent's
  // exit signal to detached children, so without this the `say`
  // subprocess can keep narrating after the view is gone — at which
  // point the user has no in-app way to silence it short of
  // `killall say` from a terminal. Empty deps so the cleanup fires
  // exactly once on unmount, not on every render.
  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  const workspacesQuery = useFetch<WorkspacesResponse>(
    `${apiBase()}/api/v1/workspaces`,
    {
      headers: authHeaders(),
      onError: (error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Could not load workspaces",
          message: error.message,
        });
      },
    },
  );

  const workspaces = workspacesQuery.data?.workspaces ?? [];

  const trimmed = query.trim();
  const isAll = workspaceId === ALL_WORKSPACES;
  const searchUrl = isAll
    ? `${apiBase()}/api/v1/search?q=${encodeURIComponent(trimmed)}`
    : `${apiBase()}/api/v1/search?q=${encodeURIComponent(trimmed)}&workspace_id=${workspaceId}`;

  const searchQuery = useFetch<SearchResponse>(searchUrl, {
    headers: authHeaders(),
    execute: !!trimmed,
    keepPreviousData: true,
    onError: (error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: error.message,
      });
    },
  });

  const entries = searchQuery.data?.entries ?? [];
  const lists = searchQuery.data?.lists ?? [];
  const isLoading =
    workspacesQuery.isLoading || (!!trimmed && searchQuery.isLoading);

  // Group entries by listId so each parent list owns a Section. Map
  // preserves insertion order, so sections appear in the order entries
  // first arrive (which is `l.updated_at DESC, e.entry` per the SQL —
  // recently-edited lists float to the top, then alpha within a list).
  const entriesByList = useMemo(() => {
    const buckets = new Map<number, ListBucket>();
    for (const e of entries) {
      let bucket = buckets.get(e.listId);
      if (!bucket) {
        bucket = {
          listId: e.listId,
          listName: e.listName,
          listIcon: e.listIcon,
          listColor: e.listColor,
          workspaceName: e.workspaceName,
          entries: [],
        };
        buckets.set(e.listId, bucket);
      }
      bucket.entries.push(e);
    }
    return Array.from(buckets.values());
  }, [entries]);

  const activeWorkspaceName = isAll
    ? "all workspaces"
    : (workspaces.find((w) => String(w.id) === workspaceId)?.name ??
      "current workspace");

  // Whether to suffix section headers with the workspace name. Only
  // when actually searching across multiple workspaces — for a single
  // workspace user, or when scoped to one workspace via the dropdown,
  // the workspace context is implicit and the suffix would be noise.
  const showWorkspaceInHeader = isAll && workspaces.length > 1;

  // Shared toggle action for every ActionPanel so the user can flip
  // the view from anywhere. Cmd+I matches Raycast's convention for
  // "inspect / detail view" toggles across the platform.
  const toggleDetailAction = (
    <Action
      title={showingDetail ? "Hide Detail" : "Show Detail"}
      icon={Icon.AppWindowSidebarRight}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      onAction={() => setShowingDetail((v) => !v)}
    />
  );

  // Toggle the caller's star on an entry. Uses useFetch's mutate for
  // optimistic update + auto-revalidate so the UI flips immediately
  // and reconciles against the server's actual state after the
  // round-trip. The mutate's optimisticUpdate runs synchronously
  // before the network call lands; if the API errors, mutate rolls
  // the local state back automatically and we surface a toast.
  const toggleEntryStar = async (entry: SearchEntryResult) => {
    const willBeStarred = !entry.isStarred;
    try {
      await searchQuery.mutate(
        apiFetch(`/api/v1/entries/${entry.id}/star`, {
          method: willBeStarred ? "POST" : "DELETE",
        }),
        {
          optimisticUpdate(current) {
            if (!current) return current;
            return {
              ...current,
              entries: current.entries.map((row) =>
                row.id === entry.id
                  ? { ...row, isStarred: willBeStarred }
                  : row,
              ),
            };
          },
        },
      );
      await showToast({
        style: Toast.Style.Success,
        title: willBeStarred ? "Starred" : "Unstarred",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: willBeStarred ? "Could not star" : "Could not unstar",
        message,
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      throttle
      isShowingDetail={showingDetail && entries.length + lists.length > 0}
      searchBarPlaceholder="Search entries and lists…"
      searchBarAccessory={
        workspaces.length > 1 ? (
          <List.Dropdown
            tooltip="Workspace"
            value={workspaceId}
            onChange={setWorkspaceId}
          >
            <List.Dropdown.Item
              title="All workspaces"
              value={ALL_WORKSPACES}
              icon={Icon.Globe}
            />
            <List.Dropdown.Section>
              {workspaces.map((w) => (
                <List.Dropdown.Item
                  key={w.id}
                  title={w.name}
                  value={String(w.id)}
                />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {entriesByList.map((bucket) => (
        <List.Section
          key={`list-section-${bucket.listId}`}
          title={
            showWorkspaceInHeader
              ? `${bucket.listName} · ${bucket.workspaceName}`
              : bucket.listName
          }
          subtitle={String(bucket.entries.length)}
        >
          {bucket.entries.map((e) => {
            const vis = listVisibility(e.listIsPublic, e.workspaceType);
            return (
              <List.Item
                key={`entry-${e.id}`}
                icon={iconForList(bucket.listIcon, bucket.listColor)}
                title={e.entry}
                subtitle={showingDetail ? undefined : e.definition}
                accessories={accessoriesForEntry(e)}
                detail={
                  <List.Item.Detail
                    markdown={entryDetailMarkdown(e)}
                    metadata={
                      <List.Item.Detail.Metadata>
                        <List.Item.Detail.Metadata.Link
                          title="Open"
                          text={apiHost()}
                          target={`${apiBase()}/${e.listId}#${e.id}`}
                        />
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label
                          title="Type"
                          text={TYPE_LABELS[e.type] ?? e.type}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="List"
                          text={e.listName}
                          icon={iconForList(e.listIcon, e.listColor)}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Visibility"
                          text={vis.label}
                          icon={vis.icon}
                        />
                        <List.Item.Detail.Metadata.Label
                          title="Workspace"
                          text={e.workspaceName}
                        />
                        {Array.isArray(e.tags) && e.tags.length > 0 && (
                          <List.Item.Detail.Metadata.TagList title="Tags">
                            {e.tags.map((tag) => (
                              <List.Item.Detail.Metadata.TagList.Item
                                key={tag}
                                text={tag}
                              />
                            ))}
                          </List.Item.Detail.Metadata.TagList>
                        )}
                      </List.Item.Detail.Metadata>
                    }
                  />
                }
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open Entry"
                      url={`${apiBase()}/${e.listId}#${e.id}`}
                    />
                    <Action.OpenInBrowser
                      title="Open List"
                      url={`${apiBase()}/${e.listId}`}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    />
                    <Action
                      title={e.isStarred ? "Unstar Entry" : "Star Entry"}
                      icon={
                        e.isStarred
                          ? Icon.StarDisabled
                          : { source: Icon.Star, tintColor: "#f59e0b" }
                      }
                      shortcut={{ modifiers: ["cmd"], key: "s" }}
                      onAction={() => toggleEntryStar(e)}
                    />
                    {toggleDetailAction}
                    <Action.CopyToClipboard
                      title="Copy Term"
                      content={e.entry}
                    />
                    <Action.CopyToClipboard
                      title="Copy Definition"
                      content={e.definition}
                      shortcut={{ modifiers: ["cmd"], key: "." }}
                    />
                    {/* TTS via macOS's built-in `say`. Two granularities:
                      Cmd+T speaks the full payload (term + definition +
                      description) which is the accessibility / glance-
                      replacement case, and Cmd+Shift+T speaks just the
                      definition which is useful when the user can
                      already see the term but wants to hear the
                      explanation without parsing it visually (or while
                      multitasking). speakText kills the previous
                      playback before starting a new one so the two
                      actions don't overlap. macOS-only: `say` has no
                      Windows equivalent, so these actions are gated out
                      on Windows rather than failing at runtime. */}
                    {isMacOS && (
                      <>
                        <Action
                          title="Speak Entry"
                          icon={Icon.SpeakerHigh}
                          shortcut={{ modifiers: ["cmd"], key: "t" }}
                          onAction={() =>
                            speakText(
                              composeSpeakable(
                                e.entry,
                                e.definition,
                                e.description,
                              ),
                            )
                          }
                        />
                        <Action
                          title="Speak Definition"
                          icon={Icon.SpeakerHigh}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                          onAction={() => speakText(e.definition)}
                        />
                        <Action
                          title="Stop Speaking"
                          icon={Icon.SpeakerOff}
                          shortcut={{ modifiers: ["cmd", "opt"], key: "t" }}
                          onAction={stopSpeaking}
                        />
                      </>
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}

      <List.Section
        title="Lists"
        subtitle={trimmed ? String(lists.length) : undefined}
      >
        {lists.map((l) => {
          const vis = listVisibility(l.isPublic, l.workspaceType);
          return (
            <List.Item
              key={`list-${l.id}`}
              icon={iconForList(l.icon, l.color)}
              title={l.name}
              subtitle={showingDetail ? undefined : (l.description ?? "")}
              accessories={
                showWorkspaceInHeader && !showingDetail
                  ? [{ text: l.workspaceName }]
                  : undefined
              }
              detail={
                <List.Item.Detail
                  markdown={[
                    `## ${l.name}`,
                    "",
                    l.description ? l.description : "_No description._",
                  ].join("\n")}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Link
                        title="Open"
                        text={apiHost()}
                        target={`${apiBase()}/${l.id}`}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Visibility"
                        text={vis.label}
                        icon={vis.icon}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Workspace"
                        text={l.workspaceName}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open List"
                    url={`${apiBase()}/${l.id}`}
                  />
                  {toggleDetailAction}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={trimmed ? "No matches" : "Start typing to search"}
        description={
          trimmed
            ? "Try a different term, or pick another workspace."
            : workspaces.length
              ? `Searching ${activeWorkspaceName}.`
              : "Loading workspaces…"
        }
        actions={
          <ActionPanel>
            {toggleDetailAction}
            <Action
              title="Open Preferences"
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
