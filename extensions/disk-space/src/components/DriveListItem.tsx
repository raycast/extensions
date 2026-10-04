import React from "react";
import { List } from "@raycast/api";
import { StorageDrive } from "../types/storage";
import { formatBytes, formatPercent } from "../utils/formatters";
import { renderSegmentMeter } from "../utils/meters";
import {
  getCategoryIcon,
  getHealthColor,
  getUsageColor,
} from "../utils/colors";
import { DriveDetail } from "./DriveDetail";
import { DriveActionPanel } from "./DriveActionPanel";

export interface DriveListItemProps {
  drive: StorageDrive;
  isShowingDetail?: boolean;
  onToggleDetail?: () => void;
  onRefresh?: () => void;
  onEject?: () => void;
}

export function DriveListItem({
  drive,
  isShowingDetail = false,
  onToggleDetail,
  onRefresh,
  onEject,
}: DriveListItemProps): JSX.Element {
  const usageColor = getUsageColor(drive.usagePercent);
  const healthColor = getHealthColor(drive.healthStatus);
  const icon = getCategoryIcon(drive.category);

  const accessories: List.Item.Accessory[] = [];

  if (!isShowingDetail) {
    // 10-Segment Unicode meter
    accessories.push({
      text: renderSegmentMeter(drive.usagePercent, 10),
      tooltip: `Space Usage: ${formatPercent(drive.usagePercent)}`,
    });

    // Usage percent tag
    accessories.push({
      tag: {
        value: formatPercent(drive.usagePercent),
        color: usageColor,
      },
      tooltip: `${formatBytes(drive.usedBytes)} used (${formatPercent(drive.usagePercent)})`,
    });

    // Free space label
    accessories.push({
      text: `${formatBytes(drive.freeBytes)} free`,
      tooltip: `${formatBytes(drive.freeBytes)} available of ${formatBytes(drive.totalBytes)}`,
    });

    // If health status is Warning or Critical, show health badge
    if (drive.healthStatus === "Warning" || drive.healthStatus === "Critical") {
      accessories.push({
        tag: {
          value: drive.healthStatus,
          color: healthColor,
        },
        tooltip: `Drive Health: ${drive.healthStatus}`,
      });
    }
  } else {
    // In detail mode, keep accessories clean and compact
    accessories.push({
      tag: {
        value: formatPercent(drive.usagePercent),
        color: usageColor,
      },
    });
    accessories.push({
      text: `${formatBytes(drive.freeBytes)} free`,
    });
  }

  return (
    <List.Item
      id={drive.id}
      key={drive.id}
      title={drive.displayName}
      subtitle={
        isShowingDetail
          ? undefined
          : `${formatBytes(drive.usedBytes)} of ${formatBytes(drive.totalBytes)}`
      }
      icon={{
        source: icon,
        tintColor: usageColor,
      }}
      accessories={accessories}
      detail={<DriveDetail drive={drive} />}
      actions={
        <DriveActionPanel
          drive={drive}
          isShowingDetail={isShowingDetail}
          onToggleDetail={onToggleDetail}
          onRefresh={onRefresh}
          onEject={onEject}
        />
      }
    />
  );
}
