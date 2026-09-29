import path from "path";
import {
  Action,
  ActionPanel,
  Clipboard,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  trash,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { getVaultPath, isValidVault } from "./vault";
import { loadNotes, Note, noteLinkMarkdown, readNoteMarkdown } from "./notes";
import { openInApp } from "./app-link";
import { buildPreview, searchNotes } from "./note-search";

async function openNote(vaultPath: string, note: Note, target: "new" | "main") {
  await openInApp(vaultPath, { type: "note", id: note.id, window: target });
}

export default function Command() {
  const vaultPath = getVaultPath();
  const valid = isValidVault(vaultPath);

  const { data: notes, isLoading, revalidate } = usePromise(loadNotes, [vaultPath], { execute: valid });

  // Rows are keyed and selected by relativePath, not by note.id: a note duplicated in Finder
  // carries its source's frontmatter id, so ids are not actually unique on disk — two rows
  // sharing one React key breaks the list. The path is unique by construction. `id` is still what
  // the deep link needs, so it stays on the Note itself.
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");

  const results = useMemo(() => searchNotes(notes ?? [], searchText), [notes, searchText]);
  const selectedNote = results.find((note) => note.relativePath === selectedPath) ?? null;

  // Built synchronously from the body already held on the note. Nothing is fetched when the
  // selection moves, so the pane never renders an empty frame that the metadata rows below it
  // then get pushed down by once content arrives.
  const previewMarkdown = useMemo(
    () => (selectedNote ? buildPreview(selectedNote.body, searchText, selectedNote.title) : undefined),
    [selectedNote, searchText],
  );

  if (!valid) {
    return (
      <List>
        <List.EmptyView
          title="This doesn't look like a MarkdownOS vault"
          description={`No .markdownos folder found in ${vaultPath}.`}
          actions={
            <ActionPanel>
              <Action title="Change Vault Folder" icon={Icon.Cog} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search notes..."
      isShowingDetail
      onSelectionChange={setSelectedPath}
      // Filtering is ours, not Raycast's. Its built-in filter is fuzzy matching over title and
      // `keywords`, and feeding it whole note bodies as keywords made a query match any note
      // whose body merely contained those letters in order, somewhere, while re-scanning every
      // body on each keystroke. searchNotes scores the same way the app's own search does.
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      {!isLoading && results.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={searchText ? "No matching notes" : "No notes yet"}
          description={
            searchText ? "Every word you type has to appear in the note." : `No .md files found in ${vaultPath}.`
          }
        />
      )}
      {results.map((note) => {
        const folder = path.dirname(note.relativePath);
        const isSelected = note.relativePath === selectedPath;
        return (
          <List.Item
            key={note.relativePath}
            id={note.relativePath}
            icon={note.pinned ? Icon.Pin : Icon.Document}
            title={note.title}
            detail={
              <List.Item.Detail
                markdown={isSelected ? previewMarkdown : undefined}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="Folder" text={folder === "." ? "Vault root" : folder} />
                    <List.Item.Detail.Metadata.Label title="Updated" text={new Date(note.updatedAt).toLocaleString()} />
                    {note.pinned && <List.Item.Detail.Metadata.Label title="Pinned" text="Yes" />}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Open in New Window"
                  icon={Icon.AppWindow}
                  onAction={() => openNote(vaultPath, note, "new")}
                />
                <Action
                  title="Open in App"
                  icon={Icon.Sidebar}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={() => openNote(vaultPath, note, "main")}
                />
                <Action.CopyToClipboard
                  title="Copy Link"
                  icon={Icon.Link}
                  content={noteLinkMarkdown(note)}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
                <Action
                  title="Copy Markdown"
                  icon={Icon.CopyClipboard}
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  onAction={async () => {
                    try {
                      const markdown = await readNoteMarkdown(note.absolutePath);
                      await Clipboard.copy(markdown);
                      await showToast({ style: Toast.Style.Success, title: "Copied markdown" });
                    } catch (error) {
                      await showFailureToast(error);
                    }
                  }}
                />
                <Action
                  title="Move to Trash"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={async () => {
                    try {
                      await trash(note.absolutePath);
                      await revalidate();
                      await showToast({ style: Toast.Style.Success, title: "Moved to Trash" });
                    } catch (error) {
                      await showFailureToast(error);
                    }
                  }}
                />
                <Action title="Change Vault Folder" icon={Icon.Cog} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
