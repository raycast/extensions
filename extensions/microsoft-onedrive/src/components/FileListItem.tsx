import { Application, List } from "@raycast/api";
import type { Drive, DriveItem, SortConfig } from "../types";
import { getItemIcon } from "../utils/display";
import { FileActionsPanel } from "./FileActionsPanel";
import { FileItemDetail } from "./FileItemDetail";

interface FileListItemProps {
  item: DriveItem;
  searchText: string;
  currentFolder: { id: string; name: string } | null;
  currentDrive: Drive | null;
  installedOfficeApps: Map<string, Application>;
  sortConfig: SortConfig;
  onNavigateDown: (folder: DriveItem) => void;
  onNavigateUp: () => void;
  onDelete: (item: DriveItem) => void;
  onDownload: (item: DriveItem) => void;
  onReveal: (item: DriveItem) => void;
  onCreateShareLink: (item: DriveItem, scope: "anonymous" | "organization", expirationDays?: number) => void;
  onUploadComplete: () => void;
  onSortChange: (field: SortConfig["field"]) => void;
}

export function FileListItem({
  item,
  searchText,
  currentFolder,
  currentDrive,
  installedOfficeApps,
  sortConfig,
  onNavigateDown,
  onNavigateUp,
  onDelete,
  onDownload,
  onReveal,
  onCreateShareLink,
  onUploadComplete,
  onSortChange,
}: FileListItemProps) {
  return (
    <List.Item
      title={item.name}
      icon={getItemIcon(item)}
      detail={
        <FileItemDetail
          item={item}
          whereFallback={currentFolder ? `/${currentFolder.name}` : "/"}
          hideWhere={!!searchText}
        />
      }
      actions={
        <FileActionsPanel
          item={item}
          installedOfficeApps={installedOfficeApps}
          onDelete={onDelete}
          onDownload={onDownload}
          onReveal={onReveal}
          onCreateShareLink={onCreateShareLink}
          navigation={{
            currentFolder,
            onNavigateDown,
            onNavigateUp,
          }}
          sorting={{
            config: sortConfig,
            onChange: onSortChange,
          }}
          upload={
            currentDrive
              ? {
                  currentDrive,
                  onComplete: onUploadComplete,
                }
              : undefined
          }
        />
      }
    />
  );
}
