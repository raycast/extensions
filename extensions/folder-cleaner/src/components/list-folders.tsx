import {
  Action,
  ActionPanel,
  Alert,
  captureException,
  Color,
  confirmAlert,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { Folder } from "../types/folders";
import { AddFoldersAction, EditFolderAction } from "./add-folder";
import { useLocalStorage } from "@raycast/utils";
import { buildException } from "../utils/buildException";

const ListFolders = () => {
  const { value: folders, setValue: setFolder, isLoading: isLoading } = useLocalStorage<Folder[]>("folders", []);

  const createNewFolder = async (folder: Folder) => {
    try {
      if (!folders) return;

      const checkFolderName = folders.find((f) => f.id === folder.id);
      if (checkFolderName) {
        await showToast(Toast.Style.Failure, "Folder not Created", "Folder with same ID already exists");
        return;
      }

      const newFolders = [...folders, folder];
      await setFolder(newFolders);

      await showToast(Toast.Style.Success, "Folder Created", "Will be used to clean your files");
    } catch (error) {
      captureException(buildException(error as Error, "Folder not created", { folder }));
      await showToast(Toast.Style.Failure, "Folder not created", "Something went wrong!");
    }
  };

  const editFolder = async (oldFolder: Folder, newFolder: Folder) => {
    try {
      if (!folders) return;

      const foundFolder = folders.find((f) => f.id === oldFolder.id);
      if (!foundFolder) {
        await showToast(Toast.Style.Failure, "Folder not Edited", "Unable to find folder to edit");
        return;
      }

      const newFolders = folders.map((f) => (f.id === foundFolder.id ? newFolder : f));
      await setFolder(newFolders);

      await showToast(Toast.Style.Success, "Folder Edited");
    } catch (error) {
      captureException(buildException(error as Error, "Folder not edited", { oldFolder, newFolder }));
      await showToast(Toast.Style.Failure, "Folder not edited", "Something went wrong!");
    }
  };

  const deleteFolder = async (folderId: string) => {
    try {
      if (!folders) return;

      const foundFolder = folders.find((f) => f.id === folderId);
      if (!foundFolder) {
        await showToast(Toast.Style.Failure, "Folder not Deleted", "Unable to find folder to delete");
        return;
      }

      const deleteConfirmation = await confirmAlert({
        title: "Delete Folder",
        message: "Are you sure you wish to delete this folder?",
        primaryAction: {
          title: "Yes",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "No",
          style: Alert.ActionStyle.Cancel,
        },
        icon: {
          source: Icon.Trash,
          tintColor: Color.Red,
        },
      });

      if (deleteConfirmation) {
        const newFolders = folders.filter((f) => f.id !== foundFolder.id);
        await setFolder(newFolders);

        await showToast(Toast.Style.Success, "Folder Deleted");
      }
    } catch (error) {
      captureException(buildException(error as Error, "Folder not deleted", { folderId }));
      await showToast(Toast.Style.Failure, "Folder not deleted", "Something went wrong!");
    }
  };

  const listIsEmpty = folders && folders.length <= 0;

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

export const ListFoldersAction = () => {
  return (
    <Action.Push
      icon={Icon.Cog}
      title="List Folders"
      target={<ListFolders />}
      shortcut={{ key: "l", modifiers: ["ctrl"] }}
    />
  );
};
