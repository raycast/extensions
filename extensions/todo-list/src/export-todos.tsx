import { Action, ActionPanel, Form, showToast, Toast } from "@raycast/api";
import { join } from "node:path";
import { TODO_FILE } from "./config";
import { exportTodos } from "./storage";

export default function ExportTodos() {
  async function onSubmit(values: { folders: string[] }) {
    try {
      const folder = values.folders[0];
      if (!folder) throw new Error("Choose a folder for the backup.");
      const destination = join(folder, `todo-list-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
      exportTodos(TODO_FILE, destination);
      await showToast({ style: Toast.Style.Success, title: "Exported Todo Backup", message: destination });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Export Todos", message: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export Todo Backup" onSubmit={onSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Save your todos, tags, due dates, priorities, and pinned and completed states to a JSON file. Keep this backup outside Raycast before migrating or reinstalling." />
      <Form.FilePicker
        id="folders"
        title="Backup Folder"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
      />
    </Form>
  );
}
