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
  // driveItem is guaranteed to exist because useMyRecentFiles filters out items without it
  const driveItem = insight.driveItem!;

  return (
    <List.Item
      key={insight.id}
      icon={getItemIcon(driveItem)}
      title={driveItem.name}
      detail={<FileItemDetail item={driveItem} lastAccessedDateTime={insight.lastUsed.lastAccessedDateTime} />}
      actions={
        <FileActionsPanel
          item={driveItem}
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
