// EntrySearchRow — one entry result row in the Search Entries command,
// extracted from search.tsx once the per-row surface grew past ~200
// lines (detail pane + metadata, star/edit/note/report actions, copy
// actions, TTS). search.tsx keeps the fetching, grouping, and section
// scaffolding; this component owns everything about a single row.
//
// Detail pane: markdown preview (term + definition + description +
// private note, each section only when present) with a metadata panel
// (web link, type, list, visibility, workspace, tags). TTS actions are
// macOS-only (gated on isMacOS; `say` has no Windows equivalent). The
// Edit action renders only when the caller has a writable role on the
// entry's list; the parent computes that from its /api/v1/lists fetch
// and passes canEdit + the list's tag catalog down.

import { Action, ActionPanel, Icon, List } from "@raycast/api";
import type { ReactNode } from "react";
import { apiBase, apiHost } from "../lib/api";
import type { SearchEntryResult, Tag } from "../lib/api";
import { entryTypeLabel } from "../lib/entryTypes";
import { iconForList, listVisibility } from "../lib/listIconCatalog";
import { isMacOS } from "../lib/platform";
import { composeSpeakable, speakText, stopSpeaking } from "../lib/tts";
import { EntryEditForm } from "./EntryEditForm";
import { EntryNoteForm } from "./EntryNoteForm";
import { EntryReportForm } from "./EntryReportForm";

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

// Compose the detail markdown for an entry: H2 term, definition, then
// the long-form description (if any), then the caller's private note
// (if any) under a "Your note" header. Plain markdown so Raycast
// renders it natively; callout prefixes like "> Example: ..." render as
// visual blockquotes for free, since the on-disk format is already
// markdown-style. Mention links were stripped server-side (migration
// 20260602000000) so links to "#123" don't sneak in. The note section
// is last because it's the most caller-specific piece; the entry's own
// content above is shared with every reader, the note is yours alone.
function entryDetailMarkdown(entry: SearchEntryResult): string {
  const lines: string[] = [];
  // Star glyph rides alongside the term in the H2 when starred, so
  // the visual signal sits at the top of the detail pane (mirroring
  // the star button at the top-right of the web's entry detail modal).
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

export function EntrySearchRow({
  entry,
  listIcon,
  listColor,
  showingDetail,
  detailToggleAction,
  canEdit,
  listTags,
  onToggleStar,
  onMutated,
}: {
  entry: SearchEntryResult;
  // Icon + color from the row's parent-list bucket (same values as the
  // entry's own listIcon/listColor; passed through for clarity at the
  // call site, which renders per-bucket).
  listIcon: string | null;
  listColor: string | null;
  showingDetail: boolean;
  // The shared Hide/Show Detail action element owned by the parent
  // (it flips parent state, so the parent constructs it).
  detailToggleAction: ReactNode;
  canEdit: boolean;
  // The parent list's tag catalog (from /api/v1/lists) for the edit
  // form's tags tooltip. Empty when unknown.
  listTags: Tag[];
  onToggleStar: () => void;
  // Called after an edit / note save so the parent can revalidate the
  // search and refresh this row's data.
  onMutated: () => void;
}) {
  const vis = listVisibility(entry.listIsPublic, entry.workspaceType);
  const hasNote = !!(entry.myNote && entry.myNote.trim());
  const entryUrl = `${apiBase()}/${entry.listId}#${entry.id}`;

  return (
    <List.Item
      icon={iconForList({
        icon: listIcon,
        color: listColor,
        name: entry.listName,
        id: entry.listId,
      })}
      title={entry.entry}
      subtitle={showingDetail ? undefined : entry.definition}
      accessories={accessoriesForEntry(entry)}
      detail={
        <List.Item.Detail
          markdown={entryDetailMarkdown(entry)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Link
                title="Open"
                text={apiHost()}
                target={entryUrl}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title="Type"
                text={entryTypeLabel(entry.type)}
              />
              <List.Item.Detail.Metadata.Label
                title="List"
                text={entry.listName}
                icon={iconForList({
                  icon: entry.listIcon,
                  color: entry.listColor,
                  name: entry.listName,
                  id: entry.listId,
                })}
              />
              <List.Item.Detail.Metadata.Label
                title="Visibility"
                text={vis.label}
                icon={vis.icon}
              />
              <List.Item.Detail.Metadata.Label
                title="Workspace"
                text={entry.workspaceName}
              />
              {Array.isArray(entry.tags) && entry.tags.length > 0 && (
                <List.Item.Detail.Metadata.TagList title="Tags">
                  {entry.tags.map((tag) => (
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
          <Action.OpenInBrowser title="Open Entry" url={entryUrl} />
          <Action.OpenInBrowser
            title="Open List"
            url={`${apiBase()}/${entry.listId}`}
            shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
          />
          {/* Edit the entry in place. Only shown when the caller has a
              writable role on this list; the edit form PATCHes
              /api/v1/entries/:id and, on success, revalidates the
              search so the detail pane reflects the change. */}
          {canEdit && (
            <Action.Push
              title="Edit Entry"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              target={
                <EntryEditForm
                  entry={{
                    id: entry.id,
                    entry: entry.entry,
                    definition: entry.definition,
                    description: entry.description,
                    type: entry.type,
                    listName: entry.listName,
                    tags: entry.tags,
                  }}
                  listTags={listTags}
                  onSaved={onMutated}
                />
              }
            />
          )}
          {/* Private note. Offered on every entry (a note needs only
              read access); Cmd+Shift+N opens the editor seeded with any
              existing note. */}
          <Action.Push
            title={hasNote ? "Edit Note" : "Add Note"}
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
            target={
              <EntryNoteForm
                entryId={entry.id}
                entryTerm={entry.entry}
                initialNote={entry.myNote ?? ""}
                onSaved={onMutated}
              />
            }
          />
          {/* Report the entry to its list owner's moderation queue.
              Offered on every entry; whether reports are accepted is
              the owner's call via the list's reports_mode, which the
              server enforces (a friendly toast covers the "reporting
              is off" case). */}
          <Action.Push
            title="Report Entry"
            icon={Icon.Flag}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
            target={
              <EntryReportForm entryId={entry.id} entryTerm={entry.entry} />
            }
          />
          <Action
            title={entry.isStarred ? "Unstar Entry" : "Star Entry"}
            icon={
              entry.isStarred
                ? Icon.StarDisabled
                : { source: Icon.Star, tintColor: "#f59e0b" }
            }
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onAction={onToggleStar}
          />
          {detailToggleAction}
          <Action.CopyToClipboard title="Copy Term" content={entry.entry} />
          <Action.CopyToClipboard
            title="Copy Definition"
            content={entry.definition}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          {/* TTS via macOS's built-in `say`. Two granularities: Cmd+T
              speaks the full payload (term + definition + description),
              the accessibility / glance-replacement case; Cmd+Shift+T
              speaks just the definition, useful when the user can
              already see the term but wants to hear the explanation
              without parsing it visually (or while multitasking).
              speakText kills the previous playback before starting a
              new one so the two actions don't overlap. macOS-only:
              `say` has no Windows equivalent, so these actions are
              gated out on Windows rather than failing at runtime. */}
          {isMacOS && (
            <>
              <Action
                title="Speak Entry"
                icon={Icon.SpeakerHigh}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={() =>
                  speakText(
                    composeSpeakable(
                      entry.entry,
                      entry.definition,
                      entry.description,
                    ),
                  )
                }
              />
              <Action
                title="Speak Definition"
                icon={Icon.SpeakerHigh}
                shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                onAction={() => speakText(entry.definition)}
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
}
