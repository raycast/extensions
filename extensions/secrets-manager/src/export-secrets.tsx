import { Action, ActionPanel, Form, confirmAlert, showInFinder, showToast, Toast } from "@raycast/api";
import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { getStore } from "./lib/context";
import { exportPlain, exportEncrypted } from "./lib/portable";

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export default function ExportSecrets() {
  async function handleSubmit(values: { format: string; passphrase: string; folder: string[] }) {
    const dir = values.folder?.[0] || join(homedir(), "Downloads");
    const store = await getStore().load();
    let contents: string;
    let file: string;

    if (values.format === "encrypted") {
      if (!values.passphrase) {
        await showToast({ style: Toast.Style.Failure, title: "Passphrase required for encrypted export" });
        return;
      }
      contents = exportEncrypted(store, values.passphrase);
      file = join(dir, `secrets-export-${stamp()}.json`);
    } else {
      const ok = await confirmAlert({
        title: "Export as plain text?",
        message: "Secret values will be written UNENCRYPTED to disk.",
      });
      if (!ok) return;
      contents = exportPlain(store);
      file = join(dir, `secrets-export-plain-${stamp()}.json`);
    }

    try {
      // 0o600: only the owner can read the exported file (may contain plaintext secrets)
      await writeFile(file, contents, { encoding: "utf8", mode: 0o600 });
    } catch (e) {
      await showToast({ style: Toast.Style.Failure, title: "Export failed", message: String(e) });
      return;
    }
    await showToast({ style: Toast.Style.Success, title: "Exported", message: file });
    await showInFinder(file);
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Export" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="format" title="Format" defaultValue="encrypted">
        <Form.Dropdown.Item value="encrypted" title="Encrypted (passphrase)" />
        <Form.Dropdown.Item value="plain" title="Plain JSON (unencrypted)" />
      </Form.Dropdown>
      <Form.PasswordField id="passphrase" title="Passphrase" placeholder="required for encrypted export" />
      <Form.FilePicker
        id="folder"
        title="Destination"
        allowMultipleSelection={false}
        canChooseDirectories
        canChooseFiles={false}
        info="Defaults to your Downloads folder"
      />
    </Form>
  );
}
