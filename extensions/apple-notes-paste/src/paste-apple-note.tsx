import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  getPreferenceValues,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { usePromise } from "@raycast/utils";

import { getNotePlainText } from "./notes";
import { getOpenNoteURL, Note } from "./notes-db";
import { useNotes } from "./use-notes";

const ALL_NOTES = "__all_notes__";
const DEFAULT_FOLDER = "__default_folder__";

type Preferences = {
  defaultFolder?: string;
  defaultAction: "paste" | "open";
  excludeFirstLineWhenPasting: boolean;
};

function withoutFirstLine(text: string) {
  return text.split(/\r?\n/).slice(1).join("\n").replace(/^\n+/, "");
}

function codeBlock(text: string) {
  return `~~~\n${text}\n~~~`;
}

function detailMarkdown(content: string, excludeFirstLine: boolean) {
  if (!excludeFirstLine) return `### Note Content\n\n${codeBlock(content)}`;

  const firstLine = content.split(/\r?\n/, 1)[0];
  return `### First Line · Not Pasted\n\n${codeBlock(firstLine)}\n\n### Content to Paste\n\n${codeBlock(withoutFirstLine(content))}`;
}

export default function PasteAppleNote() {
  const preferences = getPreferenceValues<Preferences>();
  const configuredFolder = preferences.defaultFolder?.trim() ?? "";
  const { notes, folders, isLoading, permissionView, reload } = useNotes();
  const [searchText, setSearchText] = useState("");
  const [folderFilter, setFolderFilter] = useState(configuredFolder ? DEFAULT_FOLDER : ALL_NOTES);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const visibleNotes = useMemo(() => {
    const query = searchText.trim().toLocaleLowerCase();
    return notes.filter((note) => {
      const inFolder =
        folderFilter === ALL_NOTES ||
        (folderFilter === DEFAULT_FOLDER &&
          note.folder.localeCompare(configuredFolder, undefined, { sensitivity: "accent" }) === 0) ||
        note.folderKey === folderFilter;
      const matchesSearch =
        !query || note.title.toLocaleLowerCase().includes(query) || note.snippet.toLocaleLowerCase().includes(query);
      return inFolder && matchesSearch;
    });
  }, [notes, folderFilter, searchText, configuredFolder]);

  useEffect(() => {
    if (visibleNotes.length > 0 && !visibleNotes.some((note) => note.id === selectedNoteId)) {
      setSelectedNoteId(visibleNotes[0].id);
    }
  }, [selectedNoteId, visibleNotes]);

  const selectedNote = visibleNotes.find((note) => note.id === selectedNoteId);
  const { data: selectedContent, isLoading: isLoadingContent } = usePromise(
    async (noteId?: string) => (noteId ? getNotePlainText(noteId) : undefined),
    [selectedNote?.id],
  );

  if (permissionView) return permissionView;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      selectedItemId={selectedNoteId ?? undefined}
      onSelectionChange={setSelectedNoteId}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Apple Notes to paste"
      searchBarAccessory={
        <List.Dropdown tooltip="Search Folder" value={folderFilter} onChange={setFolderFilter}>
          <List.Dropdown.Item title="All Notes" value={ALL_NOTES} />
          {configuredFolder ? (
            <List.Dropdown.Item title={`Default: ${configuredFolder}`} value={DEFAULT_FOLDER} />
          ) : null}
          <List.Dropdown.Section title="Folders">
            {folders.map((folder) => (
              <List.Dropdown.Item key={folder.key} title={`${folder.name} (${folder.account})`} value={folder.key} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {visibleNotes.map((note) => (
        <NoteItem
          key={note.id}
          note={note}
          onRefresh={reload}
          defaultAction={preferences.defaultAction}
          excludeFirstLineWhenPasting={preferences.excludeFirstLineWhenPasting}
          detailContent={selectedNote?.id === note.id ? selectedContent : undefined}
          isLoadingDetail={selectedNote?.id === note.id && isLoadingContent}
        />
      ))}
      {!isLoading && visibleNotes.length === 0 ? (
        <List.EmptyView title="No notes found" description="Try another folder or search term." />
      ) : null}
    </List>
  );
}

function NoteItem({
  note,
  onRefresh,
  defaultAction,
  excludeFirstLineWhenPasting,
  detailContent,
  isLoadingDetail,
}: {
  note: Note;
  onRefresh: () => Promise<unknown>;
  defaultAction: Preferences["defaultAction"];
  excludeFirstLineWhenPasting: boolean;
  detailContent?: string;
  isLoadingDetail: boolean;
}) {
  async function pasteNote() {
    try {
      const fullContent = await getNotePlainText(note.id);
      const content = excludeFirstLineWhenPasting ? withoutFirstLine(fullContent) : fullContent;
      await closeMainWindow();
      await Clipboard.paste(content);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could not paste note", message: String(error) });
    }
  }

  const pasteAction = <Action title="Paste Note Content" icon={Icon.Clipboard} onAction={pasteNote} />;
  const openAction = (
    <Action.Open
      title="Open in Apple Notes"
      icon={Icon.Eye}
      target={getOpenNoteURL(note.uuid)}
      application="com.apple.notes"
    />
  );
  const snippetText = detailContent ?? note.snippet;

  return (
    <List.Item
      icon={Icon.Clipboard}
      title={note.title || "Untitled Note"}
      accessories={[{ text: note.folder }]}
      detail={
        <List.Item.Detail
          isLoading={isLoadingDetail}
          markdown={detailMarkdown(detailContent ?? note.snippet, excludeFirstLineWhenPasting)}
        />
      }
      actions={
        <ActionPanel>
          {defaultAction === "paste" ? pasteAction : openAction}
          {defaultAction === "paste" ? openAction : pasteAction}
          <Action.CreateSnippet
            title="Create Raycast Snippet"
            icon={Icon.TextCursor}
            snippet={{ name: note.title || "Apple Note", text: snippetText }}
          />
          <Action.CopyToClipboard title="Copy Note Preview" icon={Icon.CopyClipboard} content={note.snippet} />
          <Action
            title="Refresh Notes"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={async () => {
              await onRefresh();
              await showHUD("Notes refreshed");
            }}
          />
        </ActionPanel>
      }
    />
  );
}
