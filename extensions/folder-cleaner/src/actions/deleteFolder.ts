import { Dispatch, SetStateAction } from "react";
import { Folder } from "../types/folders";
import { LocalStorage, showToast, Toast } from "@raycast/api";

type DeleteFolderProps = {
  folderId: string;
  existingFolders: Folder[];
  setFolders: Dispatch<SetStateAction<Folder[]>>;
};

export const DeleteFolder = async ({ folderId, existingFolders, setFolders }: DeleteFolderProps) => {
  const foundFolder = existingFolders.find((f) => f.id === folderId);
  if (!foundFolder) {
    throw new Error("Unable to find folder to delete");
  }

  const newFolderList = existingFolders.filter((f) => f.id !== foundFolder.id);
  setFolders(newFolderList);

  await LocalStorage.removeItem(foundFolder.id);
  await showToast(Toast.Style.Success, "Folder Deleted");
};
