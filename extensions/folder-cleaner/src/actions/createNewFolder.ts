import { Dispatch, SetStateAction } from "react";
import { Folder } from "../types/folders";
import { LocalStorage, showToast, Toast } from "@raycast/api";

type CreateNewFolderProps = {
  newFolder: Folder;
  existingFolders: Folder[];
  setFolders: Dispatch<SetStateAction<Folder[]>>;
};

export const CreateNewFolder = async ({ newFolder, existingFolders, setFolders }: CreateNewFolderProps) => {
  try {
    const checkFolderName = existingFolders.find((f) => f.id === newFolder.id);
    if (checkFolderName) {
      await showToast(Toast.Style.Failure, "Folder not Created", "Folder with same ID already exists");
      return;
    }

    const newFolderList = [...existingFolders, newFolder];
    setFolders(newFolderList);

    await LocalStorage.setItem(newFolder.id, JSON.stringify(newFolder));
    await showToast(Toast.Style.Success, "Folder Created", "Will be used to clean your files");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Folder not Created", "Something went wrong");
  }
};
