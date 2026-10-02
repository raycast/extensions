import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { TODO_FILE } from "./config";
import { importTodos, parseTodos } from "./storage";

export default function ImportTodos() {
  async function onSubmit(values: { files: string[] }) {
    try {
      const file = values.files[0];
      if (!file) throw new Error("Choose a Todo List backup or original todo.json file.");
      const contents = readFileSync(file, "utf8");
      const sections = parseTodos(contents);
      const count = Object.values(sections).reduce((total, items) => total + items.length, 0);
      if (
        !(await confirmAlert({
          title: "Replace Todo List?",
          message: `Import ${count} todos from this file? Your current list will be replaced, and a copy of the current file will be saved in the storage folder.`,
          primaryAction: { title: "Import and Replace", style: Alert.ActionStyle.Destructive },
        }))
      )
        return;
      importTodos(TODO_FILE, contents);
      await showToast({ style: Toast.Style.Success, title: "Imported Todos", message: `${count} todos restored` });
      await launchCommand({ name: "index", type: LaunchType.UserInitiated });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Could Not Import Todos", message: String(error) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Todo Backup" onSubmit={onSubmit} />
          <Action.ShowInFinder title="Open Todo Storage Folder" path={dirname(TODO_FILE)} />
        </ActionPanel>
      }
    >
      <Form.Description text="Restore a Todo List JSON backup, a todo.json.backup file, or an original todo.json from before a migration. Import replaces your list and preserves a copy of the current file." />
      <Form.FilePicker id="files" title="Backup File" allowMultipleSelection={false} canChooseDirectories={false} />
    </Form>
  );
}
