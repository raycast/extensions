import { Application, List } from "@raycast/api";
import type { EnrichedInsight } from "../hooks/useMyRecentFiles";
import type { DriveItem } from "../types";
import { getItemIcon } from "../utils/display";
import { FileActionsPanel } from "./FileActionsPanel";
import { FileItemDetail } from "./FileItemDetail";

interface RecentFileListItemProps {
  insight: EnrichedInsight;
  installedOfficeApps: Map<string, Application>;
  onDelete: (item: DriveItem) => void;
  onDownload: (item: DriveItem) => void;
  onReveal: (item: DriveItem) => void;
  onCreateShareLink: (item: DriveItem, scope: "anonymous" | "organization", expirationDays?: number) => void;
}

export function RecentFileListItem({
  insight,
  installedOfficeApps,
  onDelete,
  onDownload,
  onReveal,
  onCreateShareLink,
}: RecentFileListItemProps) {
  const driveItem = insight.driveItem;
  const fileName = insight.resourceVisualization.title;

  // Use DriveItem if available, otherwise fallback to insight data
  const displayItem: DriveItem = driveItem || {
    id: insight.resourceReference.id,
    name: fileName,
    webUrl: insight.resourceReference.webUrl,
    createdDateTime: "",
    lastModifiedDateTime: "",
    folder: insight.resourceVisualization.type === "folder" ? { childCount: 0 } : undefined,
  };

  return (
    <List.Item
      key={insight.id}
      icon={getItemIcon(displayItem)}
      title={fileName}
      detail={<FileItemDetail item={displayItem} lastAccessedDateTime={insight.lastUsed.lastAccessedDateTime} />}
      actions={
        <FileActionsPanel
          item={displayItem}
          installedOfficeApps={installedOfficeApps}
          onDelete={onDelete}
          onDownload={onDownload}
          onReveal={onReveal}
          onCreateShareLink={onCreateShareLink}
        />
      }
    />
  );
}
