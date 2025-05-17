import { LocalStorage } from "@raycast/api";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Folder } from "../type";
import { showFailureToast } from "@raycast/utils";

const IconFoldersKey = "iconFolders";

interface FoldersContextType {
  folders: Folder[];
  isLoading: boolean;
  addFolders: (newFolders: Folder[]) => Promise<void>;
  removeFolder: (folderToRemove: string) => Promise<void>;
  refreshFolders: () => Promise<void>;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

export function FoldersProvider({ children }: { children: ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFolders = async () => {
    try {
      const storedFolders = await LocalStorage.getItem<string>(IconFoldersKey);
      if (storedFolders) {
        setFolders(JSON.parse(storedFolders));
      }
    } catch (error) {
      showFailureToast(error, { title: "Failed to load folders" });
    } finally {
      setIsLoading(false);
    }
  };

  const addFolders = async (newFolders: Folder[]) => {
    try {
      const updatedFolders = [...folders];
      for (const newFolder of newFolders) {
        if (!updatedFolders.some((f) => f.path === newFolder.path)) {
          updatedFolders.push(newFolder);
        }
      }
      await LocalStorage.setItem(IconFoldersKey, JSON.stringify(updatedFolders));
      setFolders(updatedFolders);
    } catch (error) {
      showFailureToast(error, { title: "Failed to add folders" });
    }
  };

  const removeFolder = async (folderToRemove: string) => {
    try {
      const updatedFolders = folders.filter((folder) => folder.path !== folderToRemove);
      await LocalStorage.setItem(IconFoldersKey, JSON.stringify(updatedFolders));
      setFolders(updatedFolders);
    } catch (error) {
      showFailureToast(error, { title: "Failed to remove folder" });
    }
  };

  useEffect(() => {
    refreshFolders();
  }, []);

  return (
    <FoldersContext.Provider
      value={{
        folders,
        isLoading,
        addFolders,
        removeFolder,
        refreshFolders,
      }}
    >
      {children}
    </FoldersContext.Provider>
  );
}

export function useFolders() {
  const context = useContext(FoldersContext);
  if (context === undefined) {
    throw new Error("useFolders must be used within a FoldersProvider");
  }
  return context;
}
