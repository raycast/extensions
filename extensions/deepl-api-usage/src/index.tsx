import { List, ActionPanel, Action, showToast, Toast, LocalStorage, Icon } from "@raycast/api";
import { useState, useEffect } from "react";

import { Record } from "./types";
import RecordItem from "./components/RecordItem";
import { fetchUsage, getRecordsFromStorage } from "./util";
import EditRecordForm from "./components/EditRecordForm";
import { partition } from "lodash";

export default function RecordList() {
  const [records, setRecords] = useState<Record[]>([]);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const storedRecords = await getRecordsFromStorage();
    setRecords(storedRecords);
    if (storedRecords.length > 0) {
      showToast(Toast.Style.Animated, "Fetching usage...");

      const results = await Promise.allSettled(
        storedRecords.map((record) => fetchUsage(record.apiKey).then((usage) => ({ id: record.id, usage }))),
      );

      const updatedRecords = [...storedRecords];
      const errors: Array<{ key: string; error: string }> = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          const { id, usage } = result.value;
          const recordIndex = updatedRecords.findIndex((r) => r.id === id);
          if (recordIndex !== -1) {
            updatedRecords[recordIndex] = { ...updatedRecords[recordIndex], usage };
          }
        } else {
          const errorMessage = result.reason?.message || String(result.reason);
          errors.push({
            key: storedRecords[index].apiKey,
            error: errorMessage,
          });
          console.error(`Failed to fetch usage for key ${storedRecords[index].apiKey}:`, result.reason);
        }
      });

      await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
      setRecords(updatedRecords);

      if (errors.length > 0) {
        const errorSummary = errors
          .slice(0, 1)
          .map((e) => `Key ${e.key.slice(0, 8)}***: ${e.error}`)
          .join("\n");
        const message = errors.length > 1 ? `${errorSummary}\n...and ${errors.length - 1} more errors` : errorSummary;

        showToast(Toast.Style.Failure, "Failed to fetch some usage data", message);
      } else {
        showToast(Toast.Style.Success, "Fetch usage success");
      }
    }
  };

  const handleDelete = async (id: string) => {
    const updatedRecords = records.filter((record) => record.id !== id);
    setRecords(updatedRecords);
    await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
    showToast(Toast.Style.Success, "Record deleted");
    loadRecords();
  };

  const onModify = async (record: Record) => {
    const updatedRecords = records.map((r) => (r.id === record!.id ? record : r));
    await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
    showToast(Toast.Style.Success, "Record Modified");
    loadRecords();
  };

  const onCreate = async (newRecord: Record) => {
    const updatedRecords = [...records, newRecord];
    await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
    showToast(Toast.Style.Success, "Record added");
    loadRecords();
  };

  const onMarkInUse = async (id: string) => {
    const updatedRecords = records.map((record) => ({
      ...record,
      inUse: record.id === id ? true : record.inUse,
    }));
    await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
    showToast(Toast.Style.Success, "Record Marked In Use");
    setRecords(updatedRecords);
  };

  const onMarkUnused = async (id: string) => {
    const updatedRecords = records.map((record) => ({
      ...record,
      inUse: record.id === id ? false : record.inUse,
    }));
    await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
    showToast(Toast.Style.Success, "Record Marked Unused");
    setRecords(updatedRecords);
  };

  const addRecordNode = (
    <Action.Push title="Add Record" icon={Icon.Plus} target={<EditRecordForm onConfirm={onCreate} isNew />} />
  );

  const refreshNode = (
    <Action
      title="Refresh Usage"
      icon={Icon.Repeat}
      onAction={() => {
        loadRecords();
      }}
    />
  );

  const [inUsedRecords, unusedRecords] = partition(records, (record) => record.inUse);

  return (
    <List
      actions={
        <ActionPanel>
          {addRecordNode}
          {refreshNode}
        </ActionPanel>
      }
    >
      {records.length === 0 ? (
        <List.EmptyView title="No Records Found" description="Add your first DeepL API Key record" />
      ) : (
        <>
          {inUsedRecords.length > 0 && (
            <List.Section title="In Used Keys">
              {inUsedRecords.map((record, index) => {
                return (
                  <RecordItem
                    key={index}
                    record={record}
                    onModify={onModify}
                    onCreate={onCreate}
                    onDelete={handleDelete}
                    onRefresh={loadRecords}
                    onMarkInUse={onMarkInUse}
                    onMarkUnused={onMarkUnused}
                  />
                );
              })}
            </List.Section>
          )}
          {unusedRecords.length > 0 && (
            <List.Section title="Unused Keys">
              {unusedRecords.map((record, index) => {
                return (
                  <RecordItem
                    key={index}
                    record={record}
                    onModify={onModify}
                    onCreate={onCreate}
                    onDelete={handleDelete}
                    onRefresh={loadRecords}
                    onMarkInUse={onMarkInUse}
                    onMarkUnused={onMarkUnused}
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}
