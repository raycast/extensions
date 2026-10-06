import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { exportBackup, importBackup } from "../lib/backup";
import { readStore, reportError, type SaveStore } from "../lib/storage";

function ExportForm() {
  const { pop } = useNavigation();
  async function submit({ folders }: { folders: string[] }) {
    try {
      if (folders.length !== 1) throw new Error("Choose a destination folder.");
      const path = join(folders[0], `tally-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
      await writeFile(path, exportBackup(await readStore()), { flag: "wx", mode: 0o600 });
      await showToast({ style: Toast.Style.Success, title: "Backup Saved", message: path });
      try {
        await Clipboard.copy({ file: path });
        await showToast({
          style: Toast.Style.Success,
          title: "Backup File Copied",
          message: "Paste into Finder or transfer to your other computer.",
        });
      } catch (error) {
        await reportError("Backup Saved, but Could Not Copy File", error);
      }
      pop();
    } catch (error) {
      await reportError("Could Not Export Backup", error);
    }
  }
  return (
    <Form
      navigationTitle="Export Backup"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Backup" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Export all templates, entries, and default times to a JSON file. Transfer it to another computer and choose Import Backup there." />
      <Form.FilePicker
        id="folders"
        title="Save To"
        allowMultipleSelection={false}
        canChooseFiles={false}
        canChooseDirectories
        defaultValue={[join(homedir(), "Downloads")]}
      />
    </Form>
  );
}
function ImportForm({ save }: { save: SaveStore }) {
  const { pop } = useNavigation();
  async function submit({ files }: { files: string[] }) {
    try {
      if (files.length !== 1) throw new Error("Choose one Tally JSON backup.");
      const incoming = importBackup(await readFile(files[0], "utf8"));
      if (
        !(await confirmAlert({
          title: "Replace All Tally Data?",
          message: `Import ${incoming.templates.length} templates and ${incoming.entries.length} entries? This replaces all current templates and entries. Export a backup first if you want to keep them.`,
          primaryAction: { title: "Replace and Import", style: Alert.ActionStyle.Destructive },
        }))
      )
        return;
      if (await save(() => incoming, "Backup Imported")) pop();
    } catch (error) {
      await reportError("Could Not Import Backup", error);
    }
  }
  return (
    <Form
      navigationTitle="Import Backup"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Import Backup" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="Choose a JSON file created with Export Backup. Invalid backups leave your existing data unchanged." />
      <Form.FilePicker id="files" title="Backup File" allowMultipleSelection={false} canChooseDirectories={false} />
    </Form>
  );
}
export function BackupActions({ save }: { save: SaveStore }) {
  return (
    <ActionPanel.Section title="Move Between Computers">
      <Action.Push title="Export Backup" icon={Icon.Download} target={<ExportForm />} />
      <Action.Push title="Import Backup" icon={Icon.Upload} target={<ImportForm save={save} />} />
    </ActionPanel.Section>
  );
}
