import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Form,
  Icon,
  List,
  confirmAlert,
  useNavigation,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { type Data } from "./lib/model";
import { readBackup } from "./lib/store";
import { report, store } from "./lib/ui";

function RestorePreview({ data, onRestored }: { data: Data; onRestored: () => Promise<void> }) {
  const { pop } = useNavigation();
  const [busy, setBusy] = useState(false);
  return (
    <Detail
      isLoading={busy}
      navigationTitle="Review Backup"
      markdown={`# Restore this backup?\n\n- ${data.presets.length} presets\n- ${data.destinations.filter((d) => d.kind === "folder").length} document folder${data.destinations.filter((d) => d.kind === "folder").length === 1 ? "" : "s"}\n- ${data.destinations.filter((d) => d.kind === "collection").length} link collections\n- ${data.links.length} legacy links\n- ${data.bookmarkSources.length} bookmark profiles\n\nThis replaces your presets, configured destinations, bookmark source choices, and legacy links. Jev keeps a recovery copy of the current data first.\n\nYour files are not moved. Current filing history is kept when readable; history from the backup is not applied. Your API key is unchanged.`}
      actions={
        <ActionPanel>
          <Action
            title="Restore This Backup"
            icon={Icon.Undo}
            onAction={async () => {
              if (busy) return;
              if (
                !(await confirmAlert({
                  title: "Replace Jev settings and saved links?",
                  message: "A recovery copy will be saved first. Files and your API key are unchanged.",
                  primaryAction: { title: "Restore Backup", style: Alert.ActionStyle.Destructive },
                }))
              )
                return;
              setBusy(true);
              try {
                await store.restore(data);
                await onRestored();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Backup restored",
                  message: "Reopen other Jev commands to use the restored data.",
                });
                pop();
              } catch (e) {
                await report(e);
              } finally {
                setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    />
  );
}
function ChooseBackup({ onRestored }: { onRestored: () => Promise<void> }) {
  const { push } = useNavigation();
  const [busy, setBusy] = useState(false);
  return (
    <Form
      isLoading={busy}
      navigationTitle="Choose a Jev Backup"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Review Backup"
            onSubmit={async (v: { files: string[] }) => {
              if (busy) return;
              setBusy(true);
              try {
                const file = v.files?.[0];
                if (!file) throw new Error("Choose a Jev backup file first.");
                const data = await readBackup(file);
                push(<RestorePreview data={data} onRestored={onRestored} />);
              } catch (e) {
                await report(e);
              } finally {
                setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Backup File" allowMultipleSelection={false} canChooseDirectories={false} />
      <Form.Description text="Select a Jev JSON backup. You will review its contents before anything changes." />
    </Form>
  );
}
function ExportBackup() {
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState("");
  return (
    <Form
      isLoading={busy}
      navigationTitle="Export Jev Backup"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Backup"
            onSubmit={async (v: { folder: string[] }) => {
              if (busy) return;
              setBusy(true);
              try {
                const folder = v.folder?.[0];
                if (!folder) throw new Error("Choose where to save the backup.");
                const file = await store.exportBackup(folder);
                setSaved(file);
                await showToast({ style: Toast.Style.Success, title: "Backup saved" });
              } catch (e) {
                await report(e);
              } finally {
                setBusy(false);
              }
            }}
          />
          {saved && <Action.ShowInFinder path={saved} />}
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Save To"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
      />
      <Form.Description text="Includes your presets, folder settings, bookmark source choices, legacy links, and a copy of filing history. File contents and your API key are never included. Existing backup files are never overwritten." />
      {saved && <Form.Description title="Saved" text={saved} />}
    </Form>
  );
}
export default function Command() {
  const [backups, setBackups] = useState<Array<{ name: string; path: string }>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const { push } = useNavigation();
  async function refresh() {
    try {
      setBackups(await store.listBackups());
      setError("");
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <List isLoading={loading} searchBarPlaceholder="Find a recovery copy…">
      <List.Section title="Your Data" subtitle="API key and document contents are never backed up">
        <List.Item
          title="Export Backup"
          subtitle="Save a copy to a folder you choose"
          icon={Icon.Download}
          actions={
            <ActionPanel>
              <Action.Push title="Choose Backup Folder" target={<ExportBackup />} />
            </ActionPanel>
          }
        />
        <List.Item
          title="Restore from File"
          subtitle="Validate and preview before replacing settings and links"
          icon={Icon.Upload}
          actions={
            <ActionPanel>
              <Action.Push title="Choose Backup File" target={<ChooseBackup onRestored={refresh} />} />
            </ActionPanel>
          }
        />
      </List.Section>
      {error && (
        <List.Item
          title="Could Not Load Recovery Copies"
          subtitle={error}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={refresh} />
            </ActionPanel>
          }
        />
      )}
      <List.Section
        title="Recovery Copies"
        subtitle={
          backups.length
            ? "Latest 10 automatic copies plus copies kept before restores"
            : "Created automatically before your next change"
        }
      >
        {backups.map((b) => (
          <List.Item
            key={b.path}
            title={b.name.replace(/-[a-f0-9-]{36}\.json$/, "")}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action
                  title="Review Recovery Copy"
                  onAction={async () => {
                    try {
                      const data = await readBackup(b.path);
                      push(<RestorePreview data={data} onRestored={refresh} />);
                    } catch (e) {
                      await report(e);
                    }
                  }}
                />
                <Action.ShowInFinder path={b.path} />
                <Action title="Refresh" onAction={refresh} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
