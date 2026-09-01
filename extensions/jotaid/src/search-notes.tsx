import { Action, ActionPanel, Color, Icon, Image, Keyboard, List, getPreferenceValues } from "@raycast/api";
import { useSQL } from "@raycast/utils";
import { useMemo, useState } from "react";
import { Note, NoteType, findDatabasePath, highlightTerm, matchContext, notesQuery } from "./lib/db";
import { openNoteURL } from "./lib/deeplink";

const NOTE_TYPE_ICON: Record<NoteType, Icon> = {
  project: Icon.Folder,
  theme: Icon.Compass,
  note: Icon.Document,
};

function displayTitle(note: Note): string {
  const title = note.title?.trim();
  return title && title.length > 0 ? title : "Untitled";
}

/**
 * The preview, with the match lifted to the top.
 *
 * Marking the match in place is not enough on its own: a body match commonly sits a screen
 * or two down, so the pane opens on text that looks unrelated to what was typed. Quoting the
 * surrounding words above the note answers "why is this here" before any scrolling, and the
 * full note still follows underneath.
 */
function detailMarkdown(note: Note, searchText: string): string {
  const body = highlightTerm(note.content, searchText);
  const context = matchContext(note, searchText, 120);
  if (context === undefined) {
    return body;
  }
  return `> ${highlightTerm(context, searchText)}\n\n---\n\n${body}`;
}

/**
 * What the row says next to the title.
 *
 * A body match wins over the note's project: when the title is "Untitled" — which is the
 * normal state of a captured note until Jotaid's auto-fill names it — the matched words are
 * the only thing that explains why the row is on screen at all.
 */
function subtitle(note: Note, searchText: string, showPreview: boolean): string | undefined {
  const context = matchContext(note, searchText, 40);
  if (context !== undefined) {
    return context;
  }
  // The detail pane already spells out the project, so the row stays clean in that mode.
  return showPreview ? undefined : (note.groupName ?? undefined);
}

/**
 * What fills the list when it has no rows.
 *
 * A failed read has to say so: the query returning nothing and the database refusing to answer
 * look identical from the outside, and reading "No Notes Yet" over a library that is in fact
 * full sends the user looking for the wrong problem. The driver's own message follows, since
 * it is the one thing here that names the actual fault.
 */
function emptyState(
  error: Error | undefined,
  searchText: string,
): { icon: Image.ImageLike; title: string; description: string } {
  if (error !== undefined) {
    return {
      icon: { source: Icon.Warning, tintColor: Color.Red },
      title: "Could Not Read Your Jotaid Library",
      description: error.message,
    };
  }
  if (searchText.length > 0) {
    return {
      icon: Icon.MagnifyingGlass,
      title: "No Matching Notes",
      description: "Try a different search term.",
    };
  }
  return {
    icon: Icon.MagnifyingGlass,
    title: "No Notes Yet",
    description: "Notes you write in Jotaid will show up here.",
  };
}

export default function Command() {
  const { searchContent, showPreview } = getPreferenceValues<Preferences.SearchNotes>();
  const [searchText, setSearchText] = useState("");

  const databasePath = useMemo(() => findDatabasePath(), []);
  const query = useMemo(() => notesQuery(searchText, searchContent), [searchText, searchContent]);

  const { data, isLoading, error, permissionView } = useSQL<Note>(databasePath ?? "", query, {
    execute: databasePath !== undefined,
    permissionPriming: "This is required to search your Jotaid notes.",
  });

  if (permissionView) {
    return permissionView;
  }

  if (databasePath === undefined) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.QuestionMark}
          title="No Jotaid Library Found"
          description="Install Jotaid and launch it once, then run this command again."
        />
      </List>
    );
  }

  const notes = data ?? [];

  return (
    <List
      isLoading={isLoading}
      // The SQL statement already narrows the rows down, so letting the list filter them a
      // second time would only hide results whose match lives in the body rather than the title.
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={searchContent ? "Search titles and content" : "Search titles"}
      isShowingDetail={showPreview && notes.length > 0}
      throttle
    >
      <List.EmptyView {...emptyState(error, searchText)} />
      {notes.map((note) => (
        <List.Item
          key={note.id}
          icon={NOTE_TYPE_ICON[note.noteType] ?? Icon.Document}
          title={displayTitle(note)}
          subtitle={subtitle(note, searchText, showPreview)}
          accessories={showPreview ? undefined : [{ date: new Date(note.modifiedAt * 1000) }]}
          detail={
            showPreview ? (
              <List.Item.Detail
                markdown={detailMarkdown(note, searchText)}
                metadata={
                  <List.Item.Detail.Metadata>
                    {/* Metadata is a component, not Markdown, so this is the one place in the
                        pane that can actually carry colour — and it stays put while the note
                        scrolls. */}
                    {searchText.trim().length > 0 && (
                      <List.Item.Detail.Metadata.TagList title="Match">
                        <List.Item.Detail.Metadata.TagList.Item text={searchText.trim()} color={Color.Orange} />
                      </List.Item.Detail.Metadata.TagList>
                    )}
                    <List.Item.Detail.Metadata.Label title="Project" text={note.groupName ?? "Inbox"} />
                    <List.Item.Detail.Metadata.Label
                      title="Modified"
                      text={new Date(note.modifiedAt * 1000).toLocaleString()}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            ) : undefined
          }
          actions={
            <ActionPanel>
              <Action.Open title="Open in Jotaid" icon={Icon.Window} target={openNoteURL(note.id)} />
              <Action.CopyToClipboard
                title="Copy Content"
                content={note.content}
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              {/* Not Common.CopyDeeplink: it is bound to the same ⌘⇧C as Common.Copy above,
                  which would leave whichever comes second without a working shortcut. */}
              <Action.CopyToClipboard
                title="Copy Link"
                content={openNoteURL(note.id)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
