import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { Folder } from "../types/folders";
import { AddFoldersAction, EditFolderAction } from "./add-folder";
import { CreateNewFolder } from "../actions/createNewFolder";
import { DeleteFolder } from "../actions/deleteFolder";
import { EditFolder } from "../actions/editFolder";
import { useFetchStoredFolders } from "../hooks/useFetchStoredFolders";

const ListFolders = () => {
  const { folders, setFolders, isLoading } = useFetchStoredFolders();

  const createNewFolder = async (folder: Folder) => {
    try {
      await CreateNewFolder({ newFolder: folder, existingFolders: folders, setFolders });
    } catch (e) {
      await showToast(Toast.Style.Failure, "Folder not created", "Something went wrong!");
    }
  };

  const editFolder = async (oldFolder: Folder, newFolder: Folder) => {
    try {
      await EditFolder({ folderId: oldFolder.id, editedFolder: newFolder, existingFolders: folders, setFolders });
    } catch (e) {
      await showToast(Toast.Style.Failure, "Folder not edited", "Something went wrong!");
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      await DeleteFolder({ folderId, existingFolders: folders, setFolders });
    } catch (e) {
      await showToast(Toast.Style.Failure, "Folder not deleted", "Something went wrong!");
    }
  };

  const listIsEmpty = folders.length <= 0;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      actions={
        <ActionPanel>
          <AddFoldersAction onCreate={createNewFolder} />
        </ActionPanel>
      }
    >
      {listIsEmpty ? (
        <List.EmptyView
          icon={Icon.Folder}
          title="Folders not Setup"
          description="Oops! Looks like you haven't setup any folders."
        />
      ) : (
        folders?.map((folder) => {
          return (
            <List.Item
              title={folder.id}
              key={folder.id}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label icon={Icon.Folder} title={folder.path} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="Extensions">
                        {folder.extensions.map((extension) => (
                          <List.Item.Detail.Metadata.TagList.Item key={extension} text={extension} />
                        ))}
                      </List.Item.Detail.Metadata.TagList>
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <AddFoldersAction onCreate={createNewFolder} />
                  <EditFolderAction folder={folder} onEdit={editFolder} />
                  <Action
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={Keyboard.Shortcut.Common.Remove}
                    title="Delete Folder"
                    onAction={() => deleteFolder(folder.id)}
                  />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
};

type ListFoldersActionProps = {
  refetchFolders: () => void;
};

export const ListFoldersAction = ({ refetchFolders }: ListFoldersActionProps) => {
  return <Action.Push icon={Icon.Cog} title="List Folders" target={<ListFolders />} onPop={() => refetchFolders()} />;
};
