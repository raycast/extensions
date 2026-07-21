import { Action, ActionPanel, Form, showToast, Toast, useNavigation } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { getStore } from "./lib/context";
import { importData } from "./lib/portable";
import type { Secret } from "./lib/types";

function mergeSecrets(current: Secret[], incoming: Secret[]): Secret[] {
  const key = (s: Secret) => `${s.folder.join("/")}/${s.name}`;
  const seen = new Map(current.map((s) => [key(s), s]));
  for (const s of incoming) seen.set(key(s), s); // overwrite on folder+name conflict
  return [...seen.values()];
}

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
      current.secrets = mergeSecrets(current.secrets, imported.secrets);
      const folderKey = (f: string[]) => f.join("/");
      const folders = new Map(current.folders.map((f) => [folderKey(f), f]));
      for (const f of imported.folders) folders.set(folderKey(f), f);
      current.folders = [...folders.values()];
      await store.save(current);
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
