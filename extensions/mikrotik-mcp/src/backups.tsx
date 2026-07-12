/**
 * Backups command — mirrors the dashboard's Backups tab: the host-side backup
 * vault. Create (`/export` with flags), upload, rename, download, view, restore
 * (dry-run or committed, Safe-Mode reversible), and delete `.rsc` backups, plus
 * editing the vault directory. Restore(commit) + delete are destructive.
 */
import { basename } from "node:path";
import { readFile } from "node:fs/promises";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  Keyboard,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { postJson, withToken } from "./lib/api";
import { confirmDestructive, showFailureToast } from "./lib/confirm";
import { bytes } from "./lib/format";
import { useApi, usePolling } from "./lib/hooks";
import type { BackupItem, BackupsData } from "./lib/types";

function BackupBody({ name }: { name: string }) {
  const { data, isLoading } = useApi<{ name: string; content: string }>(
    `/api/backups/get?name=${encodeURIComponent(name)}`,
  );
  const md = data?.content
    ? `\`\`\`\n${data.content}\n\`\`\``
    : isLoading
      ? "Loading…"
      : "_Empty._";
  return <Detail isLoading={isLoading} markdown={md} navigationTitle={name} />;
}

function CreateForm({
  data,
  onDone,
}: {
  data: BackupsData | undefined;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Create Backup"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Create"
            icon={Icon.Plus}
            onSubmit={async (v: {
              device: string;
              label: string;
              show_sensitive: boolean;
              verbose: boolean;
              terse: boolean;
            }) => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Creating backup…",
              });
              try {
                const res = await postJson<{
                  ok?: boolean;
                  name?: string;
                  error?: string;
                }>("/api/backups/create", {
                  device: v.device || undefined,
                  label: v.label || undefined,
                  show_sensitive: v.show_sensitive,
                  verbose: v.verbose,
                  compact: !v.verbose,
                  terse: v.terse,
                });
                if (!res.ok) throw new Error(res.error ?? "Request failed");
                toast.style = Toast.Style.Success;
                toast.title = `Created ${res.name ?? "backup"}`;
                onDone();
                pop();
              } catch (e) {
                toast.hide();
                await showFailureToast(e, { title: "Could not create backup" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="device" title="Device" defaultValue="">
        <Form.Dropdown.Item title="Default device" value="" />
        {(data?.devices ?? []).map((d) => (
          <Form.Dropdown.Item key={d} title={d} value={d} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="label" title="Label" placeholder="pre-upgrade" />
      <Form.Checkbox
        id="show_sensitive"
        label="Include secrets (show-sensitive)"
        defaultValue={false}
      />
      <Form.Checkbox
        id="verbose"
        label="Verbose (full export)"
        defaultValue={false}
      />
      <Form.Checkbox
        id="terse"
        label="Terse (one line per item)"
        defaultValue={false}
      />
    </Form>
  );
}

function RestoreForm({
  item,
  data,
  onDone,
}: {
  item: BackupItem;
  data: BackupsData | undefined;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  async function run(device: string, confirm: boolean) {
    if (confirm) {
      const ok = await confirmDestructive({
        title: `Restore ${item.name} to ${device || "default"}?`,
        message:
          "Applies the backup to the device (Safe Mode; auto-reverts on lock-out).",
        actionTitle: "Restore",
        icon: Icon.ArrowCounterClockwise,
      });
      if (!ok) return;
    }
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: confirm ? "Restoring…" : "Dry-run…",
    });
    try {
      const res = await postJson<{
        ok?: boolean;
        message?: string;
        applied?: number;
        error?: string;
      }>("/api/backups/restore", {
        name: item.name,
        device: device || undefined,
        confirm,
      });
      if (!res.ok) throw new Error(res.error ?? "Request failed");
      toast.style = Toast.Style.Success;
      toast.title =
        res.message ||
        (confirm ? "Restored" : `Dry-run OK (${res.applied ?? 0} cmds)`);
      onDone();
      pop();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: "Restore failed" });
    }
  }
  return (
    <Form
      navigationTitle={`Restore ${item.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Dry Run"
            icon={Icon.Eye}
            onSubmit={(v: { device: string }) => run(v.device, false)}
          />
          <Action.SubmitForm
            title="Restore (Commit)"
            icon={Icon.ArrowCounterClockwise}
            style={Action.Style.Destructive}
            onSubmit={(v: { device: string }) => run(v.device, true)}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Dry-run applies then rolls back (shows what would change). Restore commits it." />
      <Form.Dropdown
        id="device"
        title="Device"
        defaultValue={item.device ?? ""}
      >
        <Form.Dropdown.Item title="Default device" value="" />
        {(data?.devices ?? []).map((d) => (
          <Form.Dropdown.Item key={d} title={d} value={d} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}

function RenameForm({
  item,
  onDone,
}: {
  item: BackupItem;
  onDone: () => void;
}) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={`Rename ${item.name}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename"
            onSubmit={async (v: { new_name: string }) => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Renaming…",
              });
              try {
                const res = await postJson<{ ok?: boolean; error?: string }>(
                  "/api/backups/rename",
                  {
                    name: item.name,
                    new_name: v.new_name,
                  },
                );
                if (!res.ok) throw new Error(res.error ?? "Request failed");
                toast.style = Toast.Style.Success;
                toast.title = "Renamed";
                onDone();
                pop();
              } catch (e) {
                toast.hide();
                await showFailureToast(e, { title: "Could not rename" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="new_name" title="New name" defaultValue={item.name} />
    </Form>
  );
}

function DirForm({ current, onDone }: { current: string; onDone: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Backup Directory"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (v: { dir: string }) => {
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Saving…",
              });
              try {
                const res = await postJson<{
                  ok?: boolean;
                  dir?: string;
                  warning?: string;
                  error?: string;
                }>("/api/backups/dir", {
                  dir: v.dir,
                });
                if (!res.ok) throw new Error(res.error ?? "Request failed");
                toast.style = Toast.Style.Success;
                toast.title = `Vault: ${res.dir ?? v.dir}`;
                if (res.warning) toast.message = res.warning;
                onDone();
                pop();
              } catch (e) {
                toast.hide();
                await showFailureToast(e, {
                  title: "Could not change directory",
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="dir"
        title="Directory"
        defaultValue={current}
        placeholder="~/.mikrotik-mcp/backups"
      />
    </Form>
  );
}

function UploadForm({ onDone }: { onDone: () => void }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle="Upload Backup"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Upload"
            icon={Icon.Upload}
            onSubmit={async (v: { file: string[] }) => {
              const path = v.file?.[0];
              if (!path) {
                await showFailureToast(new Error("Pick a .rsc file"), {
                  title: "No file selected",
                });
                return;
              }
              const toast = await showToast({
                style: Toast.Style.Animated,
                title: "Uploading…",
              });
              try {
                const content = await readFile(path, "utf8");
                const res = await postJson<{
                  ok?: boolean;
                  name?: string;
                  error?: string;
                }>("/api/backups/upload", {
                  name: basename(path),
                  content,
                });
                if (!res.ok) throw new Error(res.error ?? "Request failed");
                toast.style = Toast.Style.Success;
                toast.title = `Uploaded ${res.name ?? basename(path)}`;
                onDone();
                pop();
              } catch (e) {
                toast.hide();
                await showFailureToast(e, { title: "Upload failed" });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="file"
        title="Backup file"
        allowMultipleSelection={false}
      />
    </Form>
  );
}

export default function Command() {
  const { data, isLoading, revalidate } = useApi<BackupsData>("/api/backups");
  usePolling(revalidate, 15000);
  const backups = data?.backups ?? [];

  async function del(item: BackupItem) {
    const ok = await confirmDestructive({
      title: `Delete ${item.name}?`,
      message: "Permanently removes this backup file from the vault.",
      actionTitle: "Delete",
    });
    if (!ok) return;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Deleting…",
    });
    try {
      const res = await postJson<{ ok?: boolean; error?: string }>(
        "/api/backups/delete",
        { name: item.name },
      );
      if (!res.ok) throw new Error(res.error ?? "Request failed");
      toast.style = Toast.Style.Success;
      toast.title = "Deleted";
      revalidate();
    } catch (e) {
      toast.hide();
      await showFailureToast(e, { title: "Could not delete" });
    }
  }

  const topActions = (
    <ActionPanel.Section title="Vault">
      <Action.Push
        title="Create Backup"
        icon={Icon.Plus}
        target={<CreateForm data={data} onDone={revalidate} />}
      />
      <Action.Push
        title="Upload Backup"
        icon={Icon.Upload}
        target={<UploadForm onDone={revalidate} />}
      />
      <Action.Push
        title="Change Directory"
        icon={Icon.Folder}
        target={<DirForm current={data?.dir ?? ""} onDone={revalidate} />}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter backups…"
      navigationTitle={data ? `Backups · ${data.dir}` : "Backups"}
      actions={<ActionPanel>{topActions}</ActionPanel>}
    >
      <List.Section title="Backups" subtitle={`${backups.length}`}>
        {backups.map((b) => (
          <List.Item
            key={b.name}
            icon={Icon.Document}
            title={b.name}
            subtitle={b.device}
            accessories={[
              { text: bytes(b.bytes) },
              { date: new Date(b.modified) },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View"
                  icon={Icon.Eye}
                  target={<BackupBody name={b.name} />}
                />
                <Action.OpenInBrowser
                  title="Download"
                  icon={Icon.Download}
                  url={withToken(
                    `/api/backups/raw?name=${encodeURIComponent(b.name)}`,
                  )}
                />
                <Action.Push
                  title="Restore…"
                  icon={Icon.ArrowCounterClockwise}
                  target={
                    <RestoreForm item={b} data={data} onDone={revalidate} />
                  }
                />
                <Action.Push
                  title="Rename…"
                  icon={Icon.Pencil}
                  target={<RenameForm item={b} onDone={revalidate} />}
                />
                <Action
                  title="Delete"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => del(b)}
                />
                {topActions}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.EmptyView
        icon={Icon.Document}
        title="No backups"
        description="Create one, or upload an existing .rsc file."
      />
    </List>
  );
}
