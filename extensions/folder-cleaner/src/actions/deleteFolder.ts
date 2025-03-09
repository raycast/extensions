import { Dispatch, SetStateAction } from "react";
import { Folder } from "../types/folders";
import { LocalStorage, showToast, Toast } from "@raycast/api";

type DeleteFolderProps = {
  folderId: string;
  existingFolders: Folder[];
  setFolders: Dispatch<SetStateAction<Folder[]>>;
};

export const DeleteFolder = async ({ folderId, existingFolders, setFolders }: DeleteFolderProps) => {
  try {
    const foundFolder = existingFolders.find((f) => f.id === folderId);
    if (!foundFolder) {
      await showToast(Toast.Style.Failure, "Folder not Deleted", "Unable to find folder to delete");
      return;
    }

    await LocalStorage.removeItem(foundFolder.id);
    const newFolderList = existingFolders.filter((f) => f.id !== foundFolder.id);
    setFolders(newFolderList);

    await showToast(Toast.Style.Success, "Folder Deleted");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Folder not Deleted", "Something went wrong");
  }
};
