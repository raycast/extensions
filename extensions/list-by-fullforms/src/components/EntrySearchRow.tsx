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
import { renderImageCallouts } from "../lib/entryImages";
import {
  iconForList,
  iconForWorkspace,
  listVisibility,
} from "../lib/listIconCatalog";
import { mentionToken } from "../lib/descriptionMarkup";
import { crossShortcut, isMacOS } from "../lib/platform";
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

// Turn every single newline into a markdown hard break so multi-line
// prose keeps one line per line, matching the web. The web renders
// descriptions and notes inside a `white-space: pre-wrap` container
// (EntryDetailModal.vue `.modal__description`), where each newline is a
// visual line break; Raycast's markdown pane instead treats a lone
// newline as a soft break and collapses it to a space, which folds the
// emoji-bullet lists entries commonly use into one run-on paragraph.
// The regex only touches single newlines (a non-newline followed by one
// `\n` that isn't followed by another), so blank-line paragraph breaks,
// and the `\n\n`-spaced image blocks renderImageCallouts emits, stay
// intact. Two trailing spaces before the newline is CommonMark's hard
// break.
function hardenLineBreaks(text: string): string {
  return text.replace(/([^\n])\n(?!\n)/g, "$1  \n");
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
    // Rewrite any `> Image:` callout lines into markdown images so the
    // pane shows a bounded preview instead of a blockquoted URL, then
    // harden single newlines so the prose lines don't collapse together.
    lines.push(hardenLineBreaks(renderImageCallouts(entry.description)));
  }
  if (entry.myNote && entry.myNote.trim()) {
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("### Your note");
    lines.push("");
    lines.push(hardenLineBreaks(entry.myNote));
  }
  return lines.join("\n");
}

export function EntrySearchRow({
  entry,
  listIcon,
  listColor,
  workspaceAvatarUrl,
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
  // The entry's workspace avatar URL, resolved by the parent from its
  // /api/v1/workspaces fetch (the search rows don't carry it). Feeds
  // iconForWorkspace for the "Workspace" metadata row: the circle-masked
  // avatar when set, else a person/team glyph by workspace type. Null
  // while the workspaces fetch is in flight or the id doesn't resolve.
  workspaceAvatarUrl: string | null;
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
                icon={iconForWorkspace(workspaceAvatarUrl, entry.workspaceType)}
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
            shortcut={crossShortcut(["cmd", "shift"], "o")}
          />
          {/* Edit the entry in place. Only shown when the caller has a
              writable role on this list; the edit form PATCHes
              /api/v1/entries/:id and, on success, revalidates the
              search so the detail pane reflects the change. */}
          {canEdit && (
            <Action.Push
              title="Edit Entry"
              icon={Icon.Pencil}
              shortcut={crossShortcut(["cmd"], "e")}
              target={
                <EntryEditForm
                  entry={{
                    id: entry.id,
                    entry: entry.entry,
                    definition: entry.definition,
                    // The RAW description (mention tokens intact), not
                    // the stripped display copy this row renders: the
                    // form PATCHes its field back verbatim, so seeding
                    // it with the stripped copy would silently rewrite
                    // every [label](#id) mention to its bare label on
                    // save. Fallback covers a cached pre-20261018
                    // response during a server deploy.
                    description: entry.descriptionRaw ?? entry.description,
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
            shortcut={crossShortcut(["cmd", "shift"], "n")}
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
            shortcut={crossShortcut(["cmd", "shift"], "r")}
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
            shortcut={crossShortcut(["cmd"], "s")}
            onAction={onToggleStar}
          />
          {detailToggleAction}
          <Action.CopyToClipboard title="Copy Term" content={entry.entry} />
          <Action.CopyToClipboard
            title="Copy Definition"
            content={entry.definition}
            shortcut={crossShortcut(["cmd"], ".")}
          />
          {/* Copy the entry's mention token, the plain-text form the
              web's @-mention picker inserts into descriptions. Raycast
              forms can't host an inline @ popup (no keystroke or
              cursor APIs on Form.TextArea), so the mention flow is
              clipboard-shaped instead: copy the token here, paste it
              at the caret in a description field. The web read view
              renders it as a link to this entry. */}
          <Action.CopyToClipboard
            title="Copy as Mention"
            content={mentionToken(entry.entry, entry.id)}
            shortcut={crossShortcut(["cmd", "shift"], "m")}
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
                shortcut={crossShortcut(["cmd"], "t")}
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
                shortcut={crossShortcut(["cmd", "shift"], "t")}
                onAction={() => speakText(entry.definition)}
              />
              <Action
                title="Stop Speaking"
                icon={Icon.SpeakerOff}
                shortcut={crossShortcut(["cmd", "opt"], "t")}
                onAction={stopSpeaking}
              />
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
