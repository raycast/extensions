import { useFolders } from "../hooks/useFolders";
import { ActionPanel, Icon, List, PushAction } from "@raycast/api";
import { FolderLists } from "./FolderLists";

export function SpaceFolders({ spaceId, spaceName }: { spaceId: string; spaceName: string }) {
  const folders = useFolders(spaceId);
  return (
    <List throttle={true} isLoading={folders === undefined} navigationTitle={`${spaceName} Folders`}>
      {folders?.map((folder) => (
        <List.Item
          key={folder.id}
          title={folder.name}
          subtitle={`Total Tasks: ${folder.task_count}`}
          icon={Icon.Clipboard}
          actions={
            <ActionPanel title="Folder Actions">
              <PushAction title="Lists Page" target={<FolderLists folderId={folder?.id} folderName={folder?.name} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
