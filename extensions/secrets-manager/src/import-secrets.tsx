import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { getStore } from "./lib/context";
import { mergeStores } from "./lib/merge";
import { importData } from "./lib/portable";

export default function ImportSecrets() {
  const { pop } = useNavigation();

  async function handleSubmit(values: { file: string[]; passphrase: string }) {
    const path = values.file?.[0];
    if (!path) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a file" });
      return;
    }
    try {
      const text = await readFile(path, "utf8");
      const imported = importData(text, values.passphrase || undefined);
      const store = getStore();
      const current = await store.load();
      await store.save(mergeStores(current, imported));
      await showToast({ style: Toast.Style.Success, title: `Imported ${imported.secrets.length} secrets` });
      pop();
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Import failed", message: String(e) });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="file" title="File" allowMultipleSelection={false} />
      <Form.PasswordField id="passphrase" title="Passphrase" placeholder="only for encrypted exports" />
    </Form>
  );
}
