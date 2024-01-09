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
      try {
        showToast(Toast.Style.Animated, "Fetching usage...");
        const updatedRecords = await Promise.all(
          storedRecords.map(async (record) => ({
            ...record,
            usage: await fetchUsage(record.apiKey),
          })),
        );
        setRecords(updatedRecords);
      } catch (err: any) {
        showToast(Toast.Style.Failure, "Network Error", "Prioritize using cache, please refresh later");
        return;
      }

      showToast(Toast.Style.Success, "Fetch usage success");
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
