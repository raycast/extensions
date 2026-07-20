import { Color, List } from "@raycast/api";
import type { BreadcrumbPath, Drive } from "../types";
import { EmptyFolderActionsPanel } from "./FileActionsPanel";

interface FileListEmptyViewProps {
  isLoading: boolean;
  searchText: string;
  currentFolder: BreadcrumbPath | null;
  currentDrive: Drive | null;
  onNavigateUp: () => void;
  onUploadComplete: () => void;
}

export function FileListEmptyView({
  isLoading,
  searchText,
  currentFolder,
  currentDrive,
  onNavigateUp,
  onUploadComplete,
}: FileListEmptyViewProps) {
  return (
    <List.EmptyView
      icon={{ source: "icons/onedrive.svg", tintColor: Color.SecondaryText }}
      title={
        isLoading
          ? "Fetching results…"
          : searchText
            ? "No files found"
            : currentFolder
              ? "No files in this folder"
              : `No files in ${currentDrive?.name || "this drive"}`
      }
      description={!isLoading && searchText ? "Try a different search query" : undefined}
      actions={
        !isLoading && !searchText ? (
          <EmptyFolderActionsPanel
            currentFolder={currentFolder}
            currentDrive={currentDrive}
            onNavigateUp={onNavigateUp}
            onUploadComplete={onUploadComplete}
          />
        ) : undefined
      }
    />
  );
}
