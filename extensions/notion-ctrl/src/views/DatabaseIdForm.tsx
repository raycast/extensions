import { Form, ActionPanel, Action, showToast, Toast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { useDatabaseList } from "src/hooks/useDatabaseList";
import { getDatabaseInfo } from "src/utils/notion";
import { upsertDatabase } from "src/utils/storage";

export const DatabaseIdForm = () => {
  const { pop } = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const { databaseList, setDatabaseList } = useDatabaseList();

  const handleSubmit = async (values: { databaseId: string }) => {
    if (!values.databaseId) return showToast({ title: "Title is required", style: Toast.Style.Failure });
    setIsLoading(true);
    try {
      const databaseId = values.databaseId;
      const response = await getDatabaseInfo(databaseId);
      if (!response) throw new Error("Not found Database. Please confirm the database ID.");
      const result = await upsertDatabase(response);
      setDatabaseList([...databaseList, result]);
      pop();
    } catch (err) {
      showToast({ title: "Field", message: "Databaseの追加に失敗しました" as string, style: Toast.Style.Failure });
      console.error("[Database Submit Error]: ", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      <Form.TextField id="databaseId" title="Database ID" />
    </Form>
  );
};
