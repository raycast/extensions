/**
 * Detail view for a history entry showing all files that were renamed
 */

import { useState } from "react";
import { List, confirmAlert, Alert } from "@raycast/api";
import type { RenameHistoryEntry } from "../types";
import { HistoryFileItem } from "./history-file-item";

interface HistoryDetailViewProps {
  entry: RenameHistoryEntry;
  index: number;
  onUndo: (index: number) => Promise<void>;
}

export function HistoryDetailView({ entry, index, onUndo }: HistoryDetailViewProps) {
  const [showDetail, setShowDetail] = useState(true);

  const handleUndo = async () => {
    const changesCount = index + 1;
    const confirmed = await confirmAlert({
      title: `Undo ${changesCount} Change${changesCount > 1 ? "s" : ""}?`,
      message:
        index === 0
          ? `This will revert "${entry.description}"`
          : `This will revert all operations back to and including "${entry.description}"`,
      primaryAction: {
        title: "Undo",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await onUndo(index);
    }
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <List navigationTitle={entry.description} searchBarPlaceholder="Filter items..." isShowingDetail={showDetail}>
      <List.Section
        title={entry.description}
        subtitle={`${entry.operations.length} item${entry.operations.length !== 1 ? "s" : ""} • ${formatTime(entry.timestamp)}`}
      >
        {entry.operations.map((op, opIndex) => (
          <HistoryFileItem
            key={opIndex}
            operation={op}
            showDetail={showDetail}
            onToggleDetail={() => setShowDetail(!showDetail)}
            onUndo={handleUndo}
            undoTitle={index === 0 ? "Undo This Change" : `Undo ${index + 1} Changes`}
          />
        ))}
      </List.Section>
    </List>
  );
}
