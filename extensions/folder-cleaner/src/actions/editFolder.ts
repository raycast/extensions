import { Dispatch, SetStateAction } from "react";
import { Folder } from "../types/folders";
import { LocalStorage, showToast, Toast } from "@raycast/api";

type EditFolderProps = {
  folderId: string;
  editedFolder: Folder;
  existingFolders: Folder[];
  setFolders: Dispatch<SetStateAction<Folder[]>>;
};

export const EditFolder = async ({ folderId, editedFolder, existingFolders, setFolders }: EditFolderProps) => {
  try {
    const foundFolder = existingFolders.find((f) => f.id === folderId);
    if (!foundFolder) {
      await showToast(Toast.Style.Failure, "Folder not Edited", "Unable to find folder to edit");
      return;
    }

    const newFolderList = existingFolders.map((f) => (f.id === foundFolder.id ? editedFolder : f));
    setFolders(newFolderList);

    await LocalStorage.removeItem(foundFolder.id);
    await LocalStorage.setItem(editedFolder.id, JSON.stringify(editedFolder));

    await showToast(Toast.Style.Success, "Folder Edited");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Folder not Edited", "Something went wrong");
  }
};
