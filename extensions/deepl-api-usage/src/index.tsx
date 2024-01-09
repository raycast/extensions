import { List, ActionPanel, Action, showToast, Toast, LocalStorage, Icon } from "@raycast/api";
import { useState, useEffect } from "react";

import { Record } from "./types";
import RecordItem from "./components/RecordItem";
import { fetchUsage, getRecordsFromStorage } from "./util";
import EditRecordForm from "./components/EditRecordForm";

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

  const addRecordNode = (
    <Action.Push
      title="Add Record"
      icon={Icon.Plus}
      target={
        <EditRecordForm
          onConfirm={async (newRecord) => {
            const updatedRecords = [...records, newRecord];
            await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
            showToast(Toast.Style.Success, "Record added");
            loadRecords();
          }}
          isNew
        />
      }
    />
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
        records.map((record, index) => {
          return (
            <RecordItem
              key={index}
              record={record}
              onModify={async (record) => {
                const updatedRecords = records.map((r) => (r.id === record!.id ? record : r));
                await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
                showToast(Toast.Style.Success, "Record Modified");
                loadRecords();
              }}
              onCreate={async (newRecord) => {
                const updatedRecords = [...records, newRecord];
                await LocalStorage.setItem("records", JSON.stringify(updatedRecords));
                showToast(Toast.Style.Success, "Record added");
                loadRecords();
              }}
              onDelete={handleDelete}
              onRefresh={loadRecords}
            ></RecordItem>
          );
        })
      )}
    </List>
  );
}
