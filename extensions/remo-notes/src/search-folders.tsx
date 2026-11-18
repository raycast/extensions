import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { NoteSections } from "./components/NoteSections";
import { remoApi } from "./utils/api";
import { handleError } from "./utils/errors";

export default function SearchFolders() {
  const { isLoading, data } = useCachedPromise(() => remoApi.listFolders(), [], {
    onError: (error) => handleError(error, "Failed to fetch folders"),
  });

  const folders = data ?? [];

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search folders...">
      <List.Section title="System">
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
  filterType: "folder" | "trash" | "locked" | "vault" | "shared";
  folderId?: string;
  title: string;
}) {
  const [isShowingDetail, setIsShowingDetail] = useState(false);

  const {
    isLoading,
    data,
    pagination,
    revalidate: fetchNotes,
    mutate,
  } = useCachedPromise(
    (type: typeof filterType, fid?: string) =>
      async ({ cursor }: { cursor?: string }) => {
        const result = await remoApi.infiniteNotes(
          type === "folder" ? { folderId: fid, cursor, numItems: 30 } : { view: type, cursor, numItems: 30 },
        );
        return { data: result.page, hasMore: !result.isDone, cursor: result.continueCursor };
      },
    [filterType, folderId],
    { onError: (error) => handleError(error, "Failed to fetch notes") },
  );

  const { data: folders } = useCachedPromise(() => remoApi.listFolders(), []);

  const notes = data ?? [];

  return (
    <List
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder={`Search in ${title}...`}
      navigationTitle={title}
      isShowingDetail={isShowingDetail}
    >
      {notes.length === 0 && !isLoading ? (
        <List.EmptyView title={`No notes in ${title}`} icon={Icon.Document} />
      ) : (
        <NoteSections
          notes={notes}
          onRefresh={fetchNotes}
          mutate={mutate}
          folders={folders}
          isShowingDetail={isShowingDetail}
          onToggleDetail={() => setIsShowingDetail((prev) => !prev)}
        />
      )}
    </List>
  );
}
