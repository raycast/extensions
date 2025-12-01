import { ActionPanel, Action, List, showToast, Toast, confirmAlert, Icon, Alert } from "@raycast/api";
import { useState, useEffect } from "react";
import { loadUndoRecords, performUndo, UndoRecord } from "./lib/ingest";

export default function Command() {
  const [records, setRecords] = useState<UndoRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  async function loadRecords() {
    setIsLoading(true);
    try {
      const loaded = await loadUndoRecords();
      setRecords(loaded);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load undo history",
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUndo(record: UndoRecord) {
    const confirmed = await confirmAlert({
      title: "Undo Ingestion?",
      message: `This will delete ${record.createdFiles.length} files and restore ${record.modifiedFiles.length} files to their previous state.`,
      primaryAction: {
        title: "Undo",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (!confirmed) return;

    setIsLoading(true);
    try {
      const { deleted, restored } = await performUndo(record.id);

      await showToast({
        style: Toast.Style.Success,
        title: "Undo Complete",
        message: `Deleted ${deleted.length} files, restored ${restored.length} files`,
      });

      // Reload the list
      await loadRecords();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Undo Failed",
        message: err instanceof Error ? err.message : String(err),
      });
      setIsLoading(false);
    }
  }

  function formatDate(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }

  return (
    <List isLoading={isLoading}>
      {records.length === 0 ? (
        <List.EmptyView title="No Undo History" description="Recent ingestions will appear here" />
      ) : (
        records.map((record) => (
          <List.Item
            key={record.id}
            title={record.source.split("/").pop() || record.source}
            subtitle={`${record.createdFiles.length} created, ${record.modifiedFiles.length} modified`}
            accessories={[{ text: formatDate(record.timestamp) }]}
            actions={
              <ActionPanel>
                <Action
                  title="Undo This Ingestion"
                  icon={Icon.Undo}
                  style={Action.Style.Destructive}
                  onAction={() => handleUndo(record)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
