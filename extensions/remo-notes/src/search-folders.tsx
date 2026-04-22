import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import { NoteListItem } from "./components/NoteListItem";
import type { Folder, Note } from "./types";
import { remoApi } from "./utils/api";
import { handleError } from "./utils/errors";

export default function SearchFolders() {
  const [isLoading, setIsLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);

  useEffect(() => {
    async function fetchFolders() {
      try {
        const result = await remoApi.listFolders();
        setFolders(result);
      } catch (error) {
        handleError(error, "Failed to fetch folders");
      } finally {
        setIsLoading(false);
      }
    }
    fetchFolders();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search folders...">
      <List.Section title="System">
        <List.Item
          title="Inbox"
          icon={Icon.Tray}
          actions={
            <ActionPanel>
              <Action.Push title="Open Inbox" target={<FolderNotesList filterType="inbox" title="Inbox" />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Quick Capture"
          icon={Icon.Bolt}
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Quick Capture"
                target={<FolderNotesList filterType="quickCapture" title="Quick Capture" />}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Vault"
          icon={Icon.Shield}
          actions={
            <ActionPanel>
              <Action.Push title="Open Vault" target={<FolderNotesList filterType="vault" title="Vault" />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Shared"
          icon={Icon.TwoPeople}
          actions={
            <ActionPanel>
              <Action.Push title="Open Shared Notes" target={<FolderNotesList filterType="shared" title="Shared" />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Locked"
          icon={Icon.Lock}
          actions={
            <ActionPanel>
              <Action.Push title="Open Locked Notes" target={<FolderNotesList filterType="locked" title="Locked" />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Trash"
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <Action.Push title="Open Trash" target={<FolderNotesList filterType="trash" title="Trash" />} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="Folders">
        {folders.map((folder) => (
          <List.Item
            key={folder._id}
            title={folder.name}
            subtitle={folder.description}
            icon={{
              source: Icon.Folder,
              tintColor: folder.color || Color.SecondaryText,
            }}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Open Folder"
                  target={<FolderNotesList filterType="folder" folderId={folder._id} title={folder.name} />}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function FolderNotesList({
  filterType,
  folderId,
  title,
}: {
  filterType: "folder" | "inbox" | "trash" | "quickCapture" | "locked" | "vault" | "shared";
  folderId?: string;
  title: string;
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  // We pass a refresh function to NoteListItem, reusing the logic
  const fetchNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      let result: Note[] = [];

      if (filterType === "trash") {
        const deletedNotes = await remoApi.listNotes({
          includeDeleted: true,
          limit: 50,
        });
        result = deletedNotes.filter((note: Note) => note.deletedAt !== undefined);
      } else if (filterType === "quickCapture") {
        result = await remoApi.listNotes({
          quickCapturedOnly: true,
          limit: 50,
        });
      } else if (filterType === "inbox") {
        result = await remoApi.listNotes({
          folderId: "inbox",
          limit: 50,
        });
      } else if (filterType === "locked") {
        result = await remoApi.listNotes({
          lockedOnly: true,
          limit: 50,
        });
      } else if (filterType === "vault") {
        result = await remoApi.listNotes({
          e2eOnly: true,
          limit: 50,
        });
      } else if (filterType === "shared") {
        result = await remoApi.listNotes({
          sharedOnly: true,
          limit: 50,
        });
      } else {
        result = await remoApi.listNotes({
          folderId: folderId as Folder["_id"],
          limit: 50,
        });
      }

      // Sort pinned first
      const sortedResult = result.sort((a: Note, b: Note) => {
        if (a.isPinned === b.isPinned) return 0;
        return a.isPinned ? -1 : 1;
      });
      setNotes(sortedResult);
    } catch (error) {
      handleError(error, "Failed to fetch notes");
    } finally {
      setIsLoading(false);
    }
  }, [filterType, folderId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder={`Search in ${title}...`}
      navigationTitle={title}
      isShowingDetail={isShowingDetail}
    >
      {notes.length === 0 && !isLoading ? (
        <List.EmptyView title={`No notes in ${title}`} icon={Icon.Document} />
      ) : (
        notes.map((note) => (
          <NoteListItem
            key={note._id}
            note={note}
            onRefresh={fetchNotes}
            isShowingDetail={isShowingDetail}
            onToggleDetail={() => setIsShowingDetail((prev) => !prev)}
          />
        ))
      )}
    </List>
  );
}
