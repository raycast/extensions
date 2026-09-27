import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  useNavigation,
} from "@raycast/api";
import { readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { useState } from "react";
import { normalizeNewAccountInput } from "../vendor/lib/account-validation";
import { exportAsSyncJson } from "../vendor/lib/data-transfer";
import type { AccountData, NewAccountInput, VaultGroup } from "../vendor/lib/types";
import { commit } from "./lib/commit";
import { normalizePath, resolveVaultPath, writeBackupFile, writeVaultFile } from "./lib/vault-file";
import {
  addAccounts,
  addGroup,
  deleteForever,
  emptyTrash,
  moveToTrash,
  previewImport,
  removeGroup,
  renameGroup,
  restoreFromTrash,
  setAccountGroup,
  setAccountText,
} from "./lib/vault-ops";
import { clearCreatedSource, createDataSource, clearSyncLock, getVaultState, refreshVault, resetLocalVault, resolveConflict, selectCreatedSource, useVault } from "./lib/vault-store";
import ScanQr from "./scan-qr";

const statusLabel = { idle: "Idle", loading: "Loading", writing: "Saving", success: "Up to date", error: "Error", conflict: "Conflict" };

export default function ManageData() {
  const vault = useVault();
  const { push } = useNavigation();

  return (
    <List navigationTitle={"Settings & Data"} isLoading={vault.status === "loading" || vault.syncStatus === "writing"} searchBarPlaceholder={"Search accounts or groups"}>
      <List.Section title={"Settings"}>
        <List.Item
          icon={Icon.Gear}
          title={"Layout, Return Action & Close After Copy"}
          subtitle={"Choose list or grid, copy or paste in extension preferences; reopen the main view afterward"}
          actions={<ActionPanel><Action title={"Open Extension Preferences"} icon={Icon.Gear} onAction={openExtensionPreferences} /></ActionPanel>}
        />
      </List.Section>
      <List.Section title={"Data Source"}>
        <List.Item
          icon={Icon.SaveDocument}
          title={"Save Current Data as a Sync File"}
          subtitle={"Choose a folder and filename; the new file becomes the data source"}
          actions={<ActionPanel><Action.Push title={"Save Current Data"} icon={Icon.SaveDocument} target={<CreateSourceForm />} /></ActionPanel>}
        />
        <List.Item
          icon={vault.source === "file" ? Icon.HardDrive : Icon.Desktop}
          title={vault.source === "file" ? vault.filePath : "No file configured; using Raycast Local Vault"}
          subtitle={vault.message ?? vault.notice ?? `Sync status: ${statusLabel[vault.syncStatus]}`}
          accessories={vault.conflict ? [{ text: "Conflict Needs Resolution", icon: Icon.Warning }] : undefined}
          actions={
            <ActionPanel>
              <Action
                title={"Reload Data Source"}
                icon={Icon.ArrowClockwise}
                onAction={() => void refreshVault()}
              />
              <Action title={"Open Extension Preferences"} icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.Push title={"Save Current Data as a Sync File"} icon={Icon.SaveDocument} target={<CreateSourceForm />} />
              <Action title={"Use File or Local Vault from Extension Preferences"} icon={Icon.ArrowCounterClockwise} onAction={() => void clearCreatedSource()} />
              {vault.source === "file" && vault.needsCreate && (
                <Action
                  title={"Create Data Source File (save current data)"}
                  icon={Icon.NewDocument}
                  onAction={() => void createDataSource()}
                />
              )}
              {vault.localBroken && (
                <ActionPanel.Section title={"Local Vault Corrupted"}>
                  <Action
                    title={"Open Extension Preferences (use a data source file)"}
                    icon={Icon.Gear}
                    onAction={() => void openExtensionPreferences()}
                  />
                  <Action
                    title={"Rebuild Local Vault (discard corrupted data)"}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const ok = await resetLocalVault();
                      await showToast(
                        ok
                          ? { style: Toast.Style.Success, title: "Local vault rebuilt" }
                          : { style: Toast.Style.Failure, title: "Local vault not rebuilt", message: getVaultState().message ?? "Please try again." },
                      );
                    }}
                  />
                </ActionPanel.Section>
              )}
              {vault.lockHeld !== null && (
                <ActionPanel.Section title={"Stale Lock"}>
                  <Action
                    title={"Remove Stale Lock (ensure no other client is writing)"}
                    icon={Icon.LockUnlocked}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const removed = await clearSyncLock();
                      await showToast(
                        removed
                          ? { style: Toast.Style.Success, title: "Stale lock removed", message: "Please retry your last change." }
                          : { style: Toast.Style.Failure, title: "Lock file not found", message: "It may have been released by its owner." },
                      );
                    }}
                  />
                </ActionPanel.Section>
              )}
              {vault.conflict && (
                <ActionPanel.Section title={"Conflict"}>
                  <Action title={"Use File Version"} icon={Icon.Download} onAction={() => void resolveConflict("file")} />
                  <Action
                    title={"Use Local Version (overwrite file)"}
                    icon={Icon.Upload}
                    style={Action.Style.Destructive}
                    onAction={() => void resolveConflict("local")}
                  />
                </ActionPanel.Section>
              )}
              <ActionPanel.Section title={"Accounts"}>
                <Action title={"Add Account"} icon={Icon.Plus} onAction={() => push(<AccountForm mode="create" />)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={`Accounts (${vault.accounts.length})`}>
        {vault.accounts.map((account) => (
          <AccountItem key={account.id} account={account} groups={vault.groups} push={push} />
        ))}
      </List.Section>

      <List.Section title={`Groups (${vault.groups.length})`}>
        <List.Item
          icon={Icon.Plus}
          title={"New Group"}
          actions={
            <ActionPanel>
              <Action title={"New Group"} icon={Icon.Plus} onAction={() => push(<GroupForm mode="create" />)} />
            </ActionPanel>
          }
        />
        {vault.groups.map((group) => (
          <List.Item
            key={group.id}
            icon={Icon.Folder}
            title={group.name}
            subtitle={`${vault.accounts.filter((account) => account.groupId === group.id).length} accounts`}
            actions={
              <ActionPanel>
                <Action title={"Rename Group"} icon={Icon.Pencil} onAction={() => push(<GroupForm mode="rename" group={group} />)} />
                <Action
                  title={"Delete Group (accounts become ungrouped)"}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => void commit((snapshot) => removeGroup(snapshot, group.id), "Group deleted")}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={`Trash (${vault.trash.length})`}>
        <List.Item
          icon={Icon.Trash}
          title={"Empty Trash"}
          subtitle={"Items older than 30 days are removed on load"}
          actions={
            <ActionPanel>
              <Action
                title={"Empty Trash"}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void commit((snapshot) => emptyTrash(snapshot), "Trash emptied")}
              />
            </ActionPanel>
          }
        />
        {vault.trash.map((account) => (
          <List.Item
            key={account.id}
            icon={Icon.Trash}
            title={account.note || account.name}
            subtitle={`${account.issuer} · Deleted ${new Date(account.deletedAt ?? 0).toLocaleString("en-US")}`}
            actions={
              <ActionPanel>
                <Action
                  title={"Restore Account"}
                  icon={Icon.ArrowCounterClockwise}
                  onAction={() => void commit((snapshot) => restoreFromTrash(snapshot, account.id), "Account restored")}
                />
                <Action
                  title={"Delete Permanently"}
                  icon={Icon.DeleteDocument}
                  style={Action.Style.Destructive}
                  onAction={() => void commit((snapshot) => deleteForever(snapshot, account.id), "Permanently deleted")}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={"Import & Export"}>
        <List.Item
          icon={Icon.Camera}
          title={"Scan Screenshot"}
          subtitle={"Capture and scan QR or migration codes"}
          actions={<ActionPanel><Action.Push title={"Scan Screenshot"} icon={Icon.Camera} target={<ScanQr />} /></ActionPanel>}
        />
        <List.Item
          icon={Icon.Download}
          title={"Import from Clipboard"}
          subtitle={"Supports otpauth://, Google migration codes and goose-2fa JSON backups"}
          actions={
            <ActionPanel>
              <Action
                title={"Import from Clipboard"}
                icon={Icon.Download}
                onAction={async () => {
                  const text = await Clipboard.readText();
                  if (!text) {
                    await showToast({ style: Toast.Style.Failure, title: "Clipboard contains no text" });
                    return;
                  }
                  if (!previewImport(text, getVaultState())) {
                    await showToast({ style: Toast.Style.Failure, title: "Could not parse clipboard content" });
                    return;
                  }
                  push(<ImportPreview text={text} />);
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Upload}
          title={"Import from File"}
          actions={
            <ActionPanel>
              <Action title={"Choose Backup File"} icon={Icon.Upload} onAction={() => push(<ImportForm />)} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.SaveDocument}
          title={"Export to File"}
          actions={
            <ActionPanel>
              <Action title={"Choose Export Path"} icon={Icon.SaveDocument} onAction={() => push(<ExportForm />)} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

function AccountItem({
  account,
  groups,
  push,
}: {
  account: AccountData;
  groups: VaultGroup[];
  push: ReturnType<typeof useNavigation>["push"];
}) {
  const groupName = account.groupId ? groups.find((group) => group.id === account.groupId)?.name : undefined;
  return (
    <List.Item
      icon={account.type === "hotp" ? Icon.Hashtag : Icon.Key}
      title={account.note || account.name}
      subtitle={[account.issuer, groupName].filter(Boolean).join(" · ")}
      accessories={[{ text: account.type.toUpperCase() }]}
      actions={
        <ActionPanel>
          <Action title={"Edit Note & Name"} icon={Icon.Pencil} onAction={() => push(<AccountForm mode="edit" account={account} />)} />
          <ActionPanel.Section title={"Move to Group"}>
            <Action
              title={"Ungrouped"}
              icon={Icon.Folder}
              onAction={() => void commit((snapshot) => setAccountGroup(snapshot, account.id, null), "Account moved")}
            />
            {groups.map((group) => (
              <Action
                key={group.id}
                title={group.name}
                icon={Icon.Folder}
                onAction={() => void commit((snapshot) => setAccountGroup(snapshot, account.id, group.id), "Account moved")}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={"Move to Trash"}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => void commit((snapshot) => moveToTrash(snapshot, account.id), "Moved to Trash")}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function AccountForm({ mode, account }: { mode: "create" | "edit"; account?: AccountData }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={mode === "create" ? "Add Account" : "Edit Account"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? "Add" : "Save"}
            onSubmit={async (values: FormValues) => {
              if (mode === "create") {
                const input = normalizeNewAccountInput({
                  name: values.name,
                  issuer: values.issuer,
                  secret: values.secret,
                  type: values.type,
                  digits: Number(values.digits),
                  period: Number(values.period || 30),
                  algorithm: values.algorithm,
                  note: values.note,
                  remark: values.remark,
                });
                if (!input) {
                  await showToast({ style: Toast.Style.Failure, title: "Invalid account details", message: "Check the Base32 secret, digits and period." });
                  return;
                }
                const groupId = values.group === UNGROUPED ? null : values.group;
                const ok = await commit((snapshot) => addAccounts(snapshot, [input], groupId ?? null), "Account added");
                if (ok) pop();
                return;
              }
              if (!account) return;
              const ok = await commit(
                (snapshot) =>
                  setAccountText(snapshot, account.id, {
                    name: values.name || account.name,
                    issuer: values.issuer ?? account.issuer,
                    note: values.note,
                    remark: values.remark,
                  }),
                "Account saved",
              );
              if (ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={"Name"} defaultValue={account?.name} placeholder="alice@example.com" />
      <Form.TextField id="issuer" title={"Issuer"} defaultValue={account?.issuer} placeholder="GitHub" />
      {mode === "create" && (
        <Form.TextField id="secret" title={"Base32 Secret"} placeholder="JBSWY3DPEHPK3PXP" />
      )}
      {mode === "create" && (
        <Form.Dropdown id="type" title={"Type"} defaultValue="totp">
          <Form.Dropdown.Item value="totp" title={"TOTP (time-based)"} />
          <Form.Dropdown.Item value="hotp" title={"HOTP (counter-based)"} />
        </Form.Dropdown>
      )}
      {mode === "create" && (
        <Form.Dropdown id="digits" title={"Digits"} defaultValue="6">
          <Form.Dropdown.Item value="6" title={"6 digits"} />
          <Form.Dropdown.Item value="8" title={"8 digits"} />
        </Form.Dropdown>
      )}
      {mode === "create" && <Form.TextField id="period" title={"Period (seconds)"} defaultValue="30" />}
      {mode === "create" && (
        <Form.Dropdown id="algorithm" title={"Algorithm"} defaultValue="SHA-1">
          <Form.Dropdown.Item value="SHA-1" title="SHA-1" />
          <Form.Dropdown.Item value="SHA-256" title="SHA-256" />
          <Form.Dropdown.Item value="SHA-512" title="SHA-512" />
        </Form.Dropdown>
      )}
      <Form.TextArea id="note" title={"Note"} defaultValue={account?.note} />
      <Form.TextArea id="remark" title={"Remark"} defaultValue={account?.remark} />
    </Form>
  );
}

function GroupForm({ mode, group }: { mode: "create" | "rename"; group?: VaultGroup }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={mode === "create" ? "New Group" : "Rename Group"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? "Create" : "Save"}
            onSubmit={async (values: FormValues) => {
              const name = values.name ?? "";
              const ok = mode === "create"
                ? await commit((snapshot) => addGroup(snapshot, name).snapshot, "Group created")
                : await commit((snapshot) => renameGroup(snapshot, group?.id ?? "", name), "Group renamed");
              if (ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={"Group Name"} defaultValue={group?.name} placeholder={"Work"} />
    </Form>
  );
}

function ImportForm() {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle={"Import from File"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Import"}
            onSubmit={async (values: FormValues) => {
              const target = normalizePath(values.path ?? "");
              if (!target) return;
              let text: string;
              try {
                if (statSync(target).size > 5 * 1024 * 1024) throw new Error("Backup exceeds 5 MB");
                text = readFileSync(target, "utf8");
              } catch {
                await showToast({ style: Toast.Style.Failure, title: "Could Not Read File", message: "Check the path, permissions and 5 MB limit." });
                return;
              }
              if (!previewImport(text, getVaultState())) {
                await showToast({ style: Toast.Style.Failure, title: "Could not parse backup file" });
                return;
              }
              push(<ImportPreview text={text} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="path" title={"Backup File Path"} placeholder="~/Downloads/goose-2fa-backup.json" />
    </Form>
  );
}

function ImportPreview({ text }: { text: string }) {
  const { pop } = useNavigation();
  const preview = previewImport(text, getVaultState());
  if (!preview) return <List.EmptyView title={"Could Not Parse Backup"} />;
  const current = getVaultState();
  const imported = preview.snapshot.accounts.slice(current.accounts.length);
  const groupCount = preview.snapshot.groups.length - current.groups.length;
  return (
    <List navigationTitle={"Import Preview"} searchBarPlaceholder={"Search accounts to import"}>
      <List.Section title={`Accounts: ${preview.added} new, ${preview.dupeCount} duplicates skipped`}>
        {imported.map((account: NewAccountInput, index) => (
          <List.Item key={`${account.issuer}:${account.name}:${index}`} icon={Icon.Key} title={account.note || account.name} subtitle={account.issuer} />
        ))}
      </List.Section>
      <List.Section title={`${groupCount} groups will be added`}>
        {preview.snapshot.groups.slice(current.groups.length).map((group) => <List.Item key={group.id} icon={Icon.Folder} title={group.name} />)}
      </List.Section>
      <List.Item
        icon={Icon.Warning}
        title={"Confirm Import"}
        subtitle={"Secrets are hidden; they will be available in your local data source after import."}
        actions={<ActionPanel><Action title={`Import ${preview.added} accounts`} icon={Icon.Download} onAction={async () => {
          const currentPreview = previewImport(text, getVaultState());
          if (!currentPreview) {
            await showToast({ style: Toast.Style.Failure, title: "Could Not Parse Backup" });
            return;
          }
          const ok = await commit(() => currentPreview.snapshot, `Imported ${currentPreview.added} accounts`);
          if (ok) pop();
        }} /></ActionPanel>}
      />
    </List>
  );
}

function ExportForm() {
  const { pop } = useNavigation();
  const [path, setPath] = useState(`~/Downloads/goose-2fa-backup-${new Date().toISOString().slice(0, 10)}.json`);
  return (
    <Form
      navigationTitle={"Export to File"}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={"Export"}
            onSubmit={async () => {
              const target = normalizePath(path);
              if (!target) return;
              const snapshot = getVaultState();
              try {
                writeBackupFile(target, exportAsSyncJson(snapshot.accounts, snapshot.groups, snapshot.trash));
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Export Failed",
                  message: error instanceof Error ? error.message : String(error),
                });
                return;
              }
              await showToast({ style: Toast.Style.Success, title: "Full backup exported", message: target });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="path" title={"Export Path"} value={path} onChange={setPath} />
      <Form.Description text={"The full data source (including IDs and trash) can be used as a data source on another device."} />
    </Form>
  );
}

const UNGROUPED = "__ungrouped__";

function CreateSourceForm() {
  const { pop } = useNavigation();
  return <Form navigationTitle={"Save Current Data as a Sync File"} actions={<ActionPanel><Action.SubmitForm title={"Save and Use This File"} onSubmit={async (values: { directory?: string[]; fileName?: string }) => {
    const directory = values.directory?.[0];
    const name = values.fileName?.trim() || "goose-2fa.json";
    if (!directory || !path.isAbsolute(directory) || !/^[^/\\\0]+\.json$/i.test(name)) {
      await showToast({ style: Toast.Style.Failure, title: "Choose a folder and enter a .json filename" });
      return;
    }
    try {
      if (!statSync(directory).isDirectory()) throw new Error("Folder does not exist");
      const target = resolveVaultPath(path.join(realpathSync.native(directory), name));
      if (getVaultState().localBroken) throw new Error("Local vault is corrupted; incomplete data cannot be written to a new file");
      const current = getVaultState();
      const result = await writeVaultFile(target, exportAsSyncJson(current.accounts, current.groups, current.trash), null, true);
      if (result.status !== "ok") throw new Error(result.status === "conflict" ? "File already exists; select it in extension preferences" : "Could not create file; check folder permissions or write lock");
      await selectCreatedSource(target);
      await showToast({ style: Toast.Style.Success, title: "Data source created", message: target });
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Creation Failed", message: error instanceof Error ? error.message : String(error) });
    }
  }} /></ActionPanel>}>
    <Form.FilePicker id="directory" title={"Save Folder"} allowMultipleSelection={false} canChooseDirectories canChooseFiles={false} />
    <Form.TextField id="fileName" title={"Filename"} defaultValue="goose-2fa.json" />
    <Form.Description text={"File contains plaintext 2FA secrets. Select the same iCloud file on another computer to sync. Existing files are never overwritten."} />
  </Form>;
}

interface FormValues {
  name?: string;
  issuer?: string;
  secret?: string;
  type?: "totp" | "hotp";
  digits?: string;
  period?: string;
  algorithm?: "SHA-1" | "SHA-256" | "SHA-512";
  note?: string;
  remark?: string;
  group?: string;
  path?: string;
}
