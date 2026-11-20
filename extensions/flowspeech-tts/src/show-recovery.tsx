import { Action, ActionPanel, Alert, Clipboard, confirmAlert, Icon, List } from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import {
  clearCompletedRecovery,
  forgetRecovery,
  recoveryExport,
  recoveryRecords,
  recoveryText,
  type RecoveryRecord,
} from "./recovery";

const PAGE_SIZE = 50;

export default function Command() {
  const [records, setRecords] = useState<RecoveryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [query, setQuery] = useState("");
  const refresh = useCallback(async () => {
    try {
      setRecords(await recoveryRecords());
      setError(undefined);
    } catch {
      setError("Could not read recovery records");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function remove(record?: RecoveryRecord) {
    if (
      !(await confirmAlert({
        title: record ? "Forget This Recovery ID?" : "Clear Completed History?",
        message: record
          ? `${recoveryText(record)}\nOnly forget this ID after recovering the result or saving it elsewhere. The server job may still be running. This cannot be undone and does not cancel it.`
          : "Only successfully played requests will be removed. Pending and interrupted IDs will be kept.",
        primaryAction: { title: record ? "Forget ID" : "Clear Completed", style: Alert.ActionStyle.Destructive },
      }))
    )
      return;
    try {
      if (record) await forgetRecovery(record.requestId);
      else await clearCompletedRecovery();
      await refresh();
    } catch {
      setError("Could not update recovery records");
    }
  }

  const filtered = records.filter((record) =>
    `${recoveryText(record)} ${record.state}`.toLowerCase().includes(query.toLowerCase()),
  );
  const actions = (record?: RecoveryRecord) => (
    <ActionPanel>
      {record && (
        <Action title="Copy Request ID" icon={Icon.Clipboard} onAction={() => Clipboard.copy(record.requestId)} />
      )}
      {record?.jobId && (
        <Action title="Copy Job ID" icon={Icon.Clipboard} onAction={() => Clipboard.copy(record.jobId!)} />
      )}
      {records.length > 0 && (
        <Action
          title="Copy All Recovery IDs"
          icon={Icon.Clipboard}
          onAction={() => Clipboard.copy(recoveryExport(records))}
        />
      )}
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
      {filtered.length > limit && (
        <Action title="Show More" icon={Icon.ChevronDown} onAction={() => setLimit(limit + PAGE_SIZE)} />
      )}
      {records.some((value) => value.state === "completed") && (
        <Action title="Clear Completed History" icon={Icon.Trash} onAction={() => remove()} />
      )}
      {record && (
        <Action
          title="Forget This Recovery ID"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={() => remove(record)}
        />
      )}
    </ActionPanel>
  );
  return (
    <List
      isLoading={loading}
      filtering={false}
      navigationTitle="Speech Recovery"
      onSearchTextChange={(value) => {
        setQuery(value);
        setLimit(PAGE_SIZE);
      }}
    >
      <List.EmptyView title={error ?? "No saved speech requests"} actions={actions()} />
      {error && records.length > 0 && <List.Item title={error} icon={Icon.Warning} actions={actions()} />}
      {filtered.slice(0, limit).map((record) => (
        <List.Item
          key={record.requestId}
          title={record.requestId}
          subtitle={record.state}
          keywords={record.jobId ? [record.jobId] : []}
          accessories={[{ date: new Date(record.createdAt) }]}
          actions={actions(record)}
        />
      ))}
    </List>
  );
}
