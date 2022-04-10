import { ActionPanel, Action, List, confirmAlert, Icon, Alert, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useDatabaseList } from "./hooks/useDatabaseList";
import { useStorage } from "./hooks/useStorage";
import { getDatabaseInfo } from "./utils/notion";
import { upsertDatabase } from "./utils/storage";
import { DatabaseDetail } from "./views/DatabaseDetail";
import { DatabaseIdForm } from "./views/DatabaseIdForm";

export default function Command() {
  const { removeItem } = useStorage();
  const { databaseList, setDatabaseList } = useDatabaseList();

  const [isLoading, setIsLoading] = useState(false);

  /* 更新 */
  const handleUpdate = async (databaseId: string) => {
    if (
      await confirmAlert({
        title: "Update the database?",
        message:
          "データベースを更新しますか？\n\nデータベースを更新することで、データベースのタイトルや選択肢の情報を更新することができます。",
        icon: Icon.TwoArrowsClockwise,
        primaryAction: {
          title: "更新",
          style: Alert.ActionStyle.Default,
        },
        dismissAction: {
          title: "キャンセル",
          style: Alert.ActionStyle.Cancel,
        },
      })
    ) {
      try {
        setIsLoading(true);
        const response = await getDatabaseInfo(databaseId);
        if (!response) return;
        const result = await upsertDatabase(response);
        setDatabaseList(
          databaseList.map((database) => {
            if (database.id === databaseId) return result;
            return database;
          })
        );
        showToast({ title: "Success updated!!", style: Toast.Style.Success });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  /* 削除 */
  const handleDelete = async (databaseId: string) => {
    if (
      await confirmAlert({
        title: "Delete the database?",
        message: "データベースを削除しますか？",
        icon: Icon.Trash,
        primaryAction: {
          title: "削除",
          style: Alert.ActionStyle.Destructive,
        },
        dismissAction: {
          title: "キャンセル",
          style: Alert.ActionStyle.Cancel,
        },
      })
    ) {
      try {
        setIsLoading(true);
        await removeItem(databaseId);
        setDatabaseList(databaseList.filter((database) => database.id !== databaseId));
        showToast({ title: "Success deleted!!", style: Toast.Style.Success });
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <List navigationTitle="Setting Database" isLoading={isLoading}>
      <List.Item
        title="+ Add new a database"
        actions={
          <ActionPanel>
            <Action.Push title="Create Database" target={<DatabaseIdForm />} />
          </ActionPanel>
        }
      />
      {databaseList.map((database) => (
        <List.Item
          key={database.id}
          title={database.title}
          subtitle="view / update / delete ...(⌘ + K)"
          accessories={[{ text: database.updatedAt, icon: database.updatedAt && Icon.Clock }]}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Action Menu">
                <Action.Push
                  title="View Detail"
                  icon={Icon.TextDocument}
                  target={<DatabaseDetail databaseId={database.id} />}
                />
                <Action title="Update" icon={Icon.TwoArrowsClockwise} onAction={() => handleUpdate(database.id)} />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(database.id)}
                />
                {/* TODO: Notionで開くコマンド入れたい */}
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
