import { Action, ActionPanel, Form, Icon, popToRoot, showInFinder, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { exportBackup, importBackup } from "./backup";
import { loadAccounts, mergeAccounts } from "./accounts";

type Props = { mode: "export" | "import"; onImported: () => Promise<void> };

export function BackupForm({ mode, onImported }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  async function submit(values: { file: string[]; password: string; confirmation: string }) {
    setIsLoading(true);
    try {
      if (mode === "export") {
        if (values.password !== values.confirmation) throw new Error("Passphrases do not match.");
        const path = await exportBackup(await loadAccounts(), values.password);
        await showToast({ style: Toast.Style.Success, title: "Encrypted backup exported", message: path });
        await showInFinder(path);
      } else {
        const path = values.file[0];
        if (!path) throw new Error("Choose a backup file.");
        const added = await mergeAccounts(await importBackup(path, values.password));
        await onImported();
        await showToast({ style: Toast.Style.Success, title: "Backup imported", message: `${added} account${added === 1 ? "" : "s"} added` });
      }
      await popToRoot();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: `Could not ${mode} backup`, message: error instanceof Error ? error.message : String(error) });
    } finally {
      setIsLoading(false);
    }
  }

  const exporting = mode === "export";
  return (
    <Form
      isLoading={isLoading}
      navigationTitle={exporting ? "Export Encrypted Backup" : "Import Encrypted Backup"}
      actions={<ActionPanel><Action.SubmitForm title={exporting ? "Export Backup" : "Import Backup"} icon={exporting ? Icon.Download : Icon.Upload} onSubmit={submit} /></ActionPanel>}
    >
      {exporting ? (
        <Form.Description text="The backup is encrypted with your passphrase and saved in Downloads." />
      ) : (
        <Form.FilePicker id="file" title="Backup File" allowMultipleSelection={false} canChooseDirectories={false} />
      )}
      <Form.PasswordField id="password" title="Passphrase" autoFocus={exporting} />
      {exporting && <Form.PasswordField id="confirmation" title="Confirm Passphrase" />}
    </Form>
  );
}
