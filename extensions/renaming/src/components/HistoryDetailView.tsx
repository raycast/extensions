/**
 * Detail view for a history entry showing all files that were renamed,
 * grouped by status. Undo here is per-file; undoing the whole operation
 * lives in the history list view.
 */

import { useState, useCallback } from "react";
import { List, confirmAlert, Alert } from "@raycast/api";
import type { HistoryOperation, RenameHistoryEntry } from "../types";
import { getHistory, isUndoable, previewUndo, describeUndoPreview, getEffectiveOperations } from "../lib/history";
import { HistoryFileItem } from "./HistoryFileItem";

interface HistoryDetailViewProps {
  entry: RenameHistoryEntry;
  /** Undo the remaining files of this entry only — never entries newer than it. */
  onUndoEntry: () => Promise<void>;
  onUndoFile: (opIndex: number) => Promise<void>;
}

interface StatusSection {
  title: string;
  ops: Array<{ op: HistoryOperation; opIndex: number }>;
}

export function HistoryDetailView({ entry, onUndoEntry, onUndoFile }: HistoryDetailViewProps) {
  const [showDetail, setShowDetail] = useState(true);
  const [currentEntry, setCurrentEntry] = useState(entry);

  // The timestamp is the entry's identity: an index would go stale as soon as
  // a newer rename is recorded or the history is trimmed.
  const refreshEntry = useCallback(async () => {
    const history = await getHistory();
    const updated = history.find((e) => e.timestamp === entry.timestamp);
    if (updated) setCurrentEntry(updated);
  }, [entry.timestamp]);

  const undoableCount = currentEntry.operations.filter(isUndoable).length;

  const handleUndoFile = async (opIndex: number) => {
    await onUndoFile(opIndex);
    await refreshEntry();
  };

  const handleUndoEntry = async () => {
    const preview = await previewUndo(getEffectiveOperations(currentEntry));
    const confirmed = await confirmAlert({
      title: "Undo Entire Operation?",
      message: describeUndoPreview(preview, `"${currentEntry.description}"`),
      primaryAction: {
        title: "Undo All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await onUndoEntry();
      await refreshEntry();
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

  const sections: StatusSection[] = [
    { title: "Renamed", ops: [] },
    { title: "Could Not Undo", ops: [] },
    { title: "Undone", ops: [] },
  ];
  // Render with effective paths so a file whose parent directory was already
  // restored previews, stats, and opens from where it actually sits now.
  getEffectiveOperations(currentEntry).forEach((op, opIndex) => {
    const section = op.status === "undone" ? sections[2]! : op.status === "undo-failed" ? sections[1]! : sections[0]!;
    section.ops.push({ op, opIndex });
  });

  return (
    <List
      navigationTitle={currentEntry.description}
      searchBarPlaceholder="Filter items..."
      isShowingDetail={showDetail}
    >
      {sections
        .filter((section) => section.ops.length > 0)
        .map((section) => (
          <List.Section
            key={section.title}
            title={section.title}
            subtitle={`${section.ops.length} item${section.ops.length !== 1 ? "s" : ""} • ${formatTime(currentEntry.timestamp)}`}
          >
            {section.ops.map(({ op, opIndex }) => (
              <HistoryFileItem
                key={`${op.newPath}-${opIndex}`}
                operation={op}
                showDetail={showDetail}
                onToggleDetail={() => setShowDetail(!showDetail)}
                onUndoFile={isUndoable(op) ? () => handleUndoFile(opIndex) : undefined}
                onUndoEntry={undoableCount > 0 ? handleUndoEntry : undefined}
                undoEntryTitle={`Undo All ${undoableCount} File${undoableCount !== 1 ? "s" : ""}`}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
