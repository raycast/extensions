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
// The per-row surface (detail pane, star/edit/note/report actions,
// copy actions, macOS-only TTS via src/lib/tts.ts) lives in
// src/components/EntrySearchRow.tsx; this file owns fetching, grouping,
// and the section scaffolding around those rows.

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
import {
  apiBase,
  apiFetch,
  apiHost,
  authHeaders,
  errorMessage,
} from "./lib/api";
import type {
  WorkspacesResponse,
  ListsResponse,
  ListRow,
  SearchEntryResult,
} from "./lib/api";
import {
  iconForList,
  iconForWorkspace,
  listVisibility,
} from "./lib/listIconCatalog";
import { stopSpeaking } from "./lib/tts";
import AddEntryCommand from "./add-entry";
import { EntrySearchRow } from "./components/EntrySearchRow";

const ALL_WORKSPACES = "all";

// Roles that can edit an entry, matching the server's can_edit_list
// gate (owner/admin/editor; viewer is read-only). Used to decide
// whether the "Edit Entry" action appears on a search result row.
const WRITABLE_ROLES = new Set(["owner", "admin", "editor"]);

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

  // Fetch the caller's lists once so we can (a) gate the "Edit Entry"
  // action to lists the caller can write to, and (b) hand the list's
  // tag catalog to the edit form's tag picker. Non-fatal on error: if
  // this fails the Edit action just stays hidden and the read-only /
  // note actions still work. Notes need only read access, so the note
  // action never depends on this fetch.
  const listsQuery = useFetch<ListsResponse>(`${apiBase()}/api/v1/lists`, {
    headers: authHeaders(),
    onError: () => {},
  });

  const listsById = useMemo(() => {
    const map = new Map<number, ListRow>();
    for (const l of listsQuery.data?.lists ?? []) {
      map.set(l.id, l);
    }
    return map;
  }, [listsQuery.data]);

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
      await showToast({
        style: Toast.Style.Failure,
        title: willBeStarred ? "Could not star" : "Could not unstar",
        message: errorMessage(error),
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
                  icon={iconForWorkspace(w.avatar_url, w.type)}
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
            // Gate "Edit Entry" on the caller's role for this entry's
            // list (from the lists fetch). Absent while lists load, or
            // for a public list the caller only favorited (viewer) →
            // no Edit action.
            const editableList = listsById.get(e.listId);
            const canEdit =
              !!editableList && WRITABLE_ROLES.has(editableList.effective_role);
            return (
              <EntrySearchRow
                key={`entry-${e.id}`}
                entry={e}
                listIcon={bucket.listIcon}
                listColor={bucket.listColor}
                showingDetail={showingDetail}
                detailToggleAction={toggleDetailAction}
                canEdit={canEdit}
                listTags={
                  editableList && Array.isArray(editableList.tags)
                    ? editableList.tags
                    : []
                }
                onToggleStar={() => toggleEntryStar(e)}
                onMutated={() => searchQuery.revalidate()}
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
              icon={iconForList({
                icon: l.icon,
                color: l.color,
                name: l.name,
                id: l.id,
              })}
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
            ? "Nothing here yet. Press Enter to add it, or pick another workspace."
            : workspaces.length
              ? `Searching ${activeWorkspaceName}.`
              : "Loading workspaces…"
        }
        actions={
          <ActionPanel>
            {/* Offer to create the missing entry right from the "No
                matches" state, pre-filled with the search term. Pushes
                the Quick Add Entry form onto the nav stack so the user
                stays in this window (Esc pops back to the search); the
                term rides along via AddEntryCommand's initialEntry prop.
                Only when there's an actual query to seed the form. */}
            {trimmed && (
              <Action.Push
                title={`Add "${trimmed}" as a New Entry`}
                icon={Icon.Plus}
                target={<AddEntryCommand initialEntry={trimmed} />}
              />
            )}
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
