import { LocalStorage } from "@raycast/api";
import { createContext, useContext, useEffect, useState } from "react";
import { Folder } from "../type";

const IconFoldersKey = "iconFolderssss";

interface FoldersContextType {
  folders: Folder[];
  isLoading: boolean;
  addFolders: (newFolders: Folder[]) => Promise<void>;
  removeFolder: (folderToRemove: string) => Promise<void>;
  refreshFolders: () => Promise<void>;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

export function FoldersProvider({ children }: { children: React.ReactNode }) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFolders = async () => {
    try {
      const storedFolders = await LocalStorage.getItem<string>(IconFoldersKey);
      setFolders(JSON.parse(storedFolders || "[]"));
    } catch (error) {
      console.error("Error loading folders:", error);
      setFolders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const addFolders = async (newFolders: Folder[]) => {
    const updatedFolders = [...folders];
    for (const newFolder of newFolders) {
      if (!updatedFolders.some((f) => f.path === newFolder.path)) {
        updatedFolders.push(newFolder);
      }
    }
    await LocalStorage.setItem(IconFoldersKey, JSON.stringify(updatedFolders));
    setFolders(updatedFolders);
  };

  const removeFolder = async (folderToRemove: string) => {
    const updatedFolders = folders.filter((folder) => folder.path !== folderToRemove);
    await LocalStorage.setItem(IconFoldersKey, JSON.stringify(updatedFolders));
    setFolders(updatedFolders);
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
