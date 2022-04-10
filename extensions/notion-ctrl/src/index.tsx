import { Form, ActionPanel, Action, showToast, Toast, useNavigation, closeMainWindow, showHUD } from "@raycast/api";
import { useMemo, useState } from "react";
import { postContents } from "./utils/notion";
import { Database, PostContents } from "./types";
import { useDatabaseList } from "./hooks/useDatabaseList";
import { DatabaseIdForm } from "./views/DatabaseIdForm";
import { useStorage } from "./hooks/useStorage";

const initialDatabase: Database = {
  id: "",
  title: "",
  categories: null,
  tags: null,
  check: false,
  date: false,
};

export default function Command() {
  const { pop } = useNavigation();
  const { setItem, previousSelectedDatabaseId } = useStorage();
  const { databaseList } = useDatabaseList();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState(previousSelectedDatabaseId);

  const databaseIds = useMemo(() => databaseList.map((database) => database.id), [databaseList]);
  const selectedDatabase = useMemo(() => {
    return databaseList.find((database) => database.id === selectedDatabaseId) || initialDatabase;
  }, [databaseList, selectedDatabaseId, previousSelectedDatabaseId]);

  /* 送信 */
  const handleSubmit = async (values: PostContents) => {
    /* Validation */
    if (!values.title) return showToast({ title: "Title is required", style: Toast.Style.Failure });
    if (!values.databaseId) return showToast({ title: "Database is required", style: Toast.Style.Failure });

    setIsLoading(true);
    try {
      await postContents(values);
      await setItem("previousSelectedDatabaseId", values.databaseId);
      await showHUD("Success!!");
      pop();
      await closeMainWindow();
    } catch (err) {
      showToast({ title: "Field", message: "送信に失敗しました", style: Toast.Style.Failure });
      console.error("[Post Error]: ", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDatabaseId = (cursor: number) => {
    const currentIndex = databaseIds.indexOf(selectedDatabaseId);
    if (currentIndex === 0 && cursor === -1) {
      setSelectedDatabaseId(databaseIds[databaseIds.length - 1]);
    } else {
      setSelectedDatabaseId(databaseIds[currentIndex + cursor] || databaseIds[0]);
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <Action.Push title="Add database" target={<DatabaseIdForm />} />
          <Action
            title="prev"
            onAction={() => handleSelectDatabaseId(-1)}
            shortcut={{ modifiers: ["shift"], key: "arrowUp" }}
          />
          <Action
            title="next"
            onAction={() => handleSelectDatabaseId(1)}
            shortcut={{ modifiers: ["shift"], key: "arrowDown" }}
          />
        </ActionPanel>
      }
      isLoading={isLoading}
    >
      {/* <Form.Description title="selected database" text={selectedDatabase.title} />
      <Form.Description text="switch by `Shift + ↑ or ↓`" /> */}
      <Form.Dropdown
        id="databaseId"
        title="Database Name"
        defaultValue={previousSelectedDatabaseId}
        value={selectedDatabaseId}
        onChange={(value) => setSelectedDatabaseId(value)}
      >
        {databaseList.map((database) => (
          <Form.Dropdown.Item key={database.id} value={database.id} title={database.title} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      <Form.TextField id="title" title="title" placeholder="short text" />
      <Form.TextArea id="content" title="page contents" placeholder="about content" />

      {selectedDatabase.date && <Form.DatePicker id="date" title="date" />}
      {selectedDatabase.check && <Form.Checkbox id="check" title="Check" label="Checkbox Label" />}

      {selectedDatabase.categories && (
        <Form.Dropdown id="category" title="category" defaultValue="">
          {selectedDatabase.categories.map((categoryName, index) => (
            <Form.Dropdown.Item key={`${categoryName}-${index}`} value={categoryName} title={categoryName} />
          ))}
        </Form.Dropdown>
      )}

      {selectedDatabase.tags && (
        <Form.TagPicker id="tags" title="tags">
          {selectedDatabase.tags.map((tagName, index) => (
            <Form.TagPicker.Item key={`${tagName}-${index}`} value={tagName} title={tagName} />
          ))}
        </Form.TagPicker>
      )}
    </Form>
  );
}
