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
import { syncStatus, t } from "./lib/i18n";
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

export default function ManageData() {
  const vault = useVault();
  const { push } = useNavigation();

  return (
    <List navigationTitle={t("Settings & Data", "设置与数据")} isLoading={vault.status === "loading" || vault.syncStatus === "writing"} searchBarPlaceholder={t("Search accounts or groups", "搜索账户或分组")}>
      <List.Section title={t("Settings", "设置")}>
        <List.Item
          icon={Icon.Gear}
          title={t("Layout, Return Action & Close After Copy", "布局、回车动作与复制后关闭")}
          subtitle={t("Choose list or grid, copy or paste in extension preferences; reopen the main view afterward", "在扩展设置中选择列表或宫格、复制或粘贴；更改后重新打开主界面")}
          actions={<ActionPanel><Action title={t("Open Extension Preferences", "打开扩展设置")} icon={Icon.Gear} onAction={openExtensionPreferences} /></ActionPanel>}
        />
      </List.Section>
      <List.Section title={t("Data Source", "数据源")}>
        <List.Item
          icon={vault.source === "file" ? Icon.HardDrive : Icon.Desktop}
          title={vault.source === "file" ? vault.filePath : t("No file configured; using Raycast Local Vault", "未配置文件，使用 Raycast 本地库")}
          subtitle={vault.message ?? vault.notice ?? t(`Sync status: ${syncStatus(vault.syncStatus)}`, `同步状态：${syncStatus(vault.syncStatus)}`)}
          accessories={vault.conflict ? [{ text: t("Conflict Needs Resolution", "冲突待处理"), icon: Icon.Warning }] : undefined}
          actions={
            <ActionPanel>
              <Action
                title={t("Reload Data Source", "重新读取数据源文件")}
                icon={Icon.ArrowClockwise}
                onAction={() => void refreshVault()}
              />
              <Action title={t("Open Extension Preferences", "打开扩展设置")} icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action.Push title={t("Create Data Source in Folder", "指定目录新建数据源")} icon={Icon.NewDocument} target={<CreateSourceForm />} />
              <Action title={t("Use File or Local Vault from Extension Preferences", "改用扩展设置选择的文件或本地库")} icon={Icon.ArrowCounterClockwise} onAction={() => void clearCreatedSource()} />
              {vault.source === "file" && vault.needsCreate && (
                <Action
                  title={t("Create Data Source File (save current data)", "新建数据源文件（写入当前数据）")}
                  icon={Icon.NewDocument}
                  onAction={() => void createDataSource()}
                />
              )}
              {vault.localBroken && (
                <ActionPanel.Section title={t("Local Vault Corrupted", "本地库损坏")}>
                  <Action
                    title={t("Open Extension Preferences (use a data source file)", "打开扩展偏好设置（改用数据源文件）")}
                    icon={Icon.Gear}
                    onAction={() => void openExtensionPreferences()}
                  />
                  <Action
                    title={t("Rebuild Local Vault (discard corrupted data)", "重建本地库（放弃损坏的旧数据）")}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const ok = await resetLocalVault();
                      await showToast(
                        ok
                          ? { style: Toast.Style.Success, title: t("Local vault rebuilt", "本地库已重建") }
                          : { style: Toast.Style.Failure, title: t("Local vault not rebuilt", "本地库未重建"), message: getVaultState().message ?? t("Please try again.", "请重试。") },
                      );
                    }}
                  />
                </ActionPanel.Section>
              )}
              {vault.lockHeld !== null && (
                <ActionPanel.Section title={t("Stale Lock", "残留锁")}>
                  <Action
                    title={t("Remove Stale Lock (ensure no other client is writing)", "清理残留锁文件（确认没有其他端在写）")}
                    icon={Icon.LockUnlocked}
                    style={Action.Style.Destructive}
                    onAction={async () => {
                      const removed = await clearSyncLock();
                      await showToast(
                        removed
                          ? { style: Toast.Style.Success, title: t("Stale lock removed", "已清理残留锁"), message: t("Please retry your last change.", "请重新执行刚才的改动。") }
                          : { style: Toast.Style.Failure, title: t("Lock file not found", "没有找到锁文件"), message: t("It may have been released by its owner.", "可能已被持有者释放。") },
                      );
                    }}
                  />
                </ActionPanel.Section>
              )}
              {vault.conflict && (
                <ActionPanel.Section title={t("Conflict", "冲突")}>
                  <Action title={t("Use File Version", "以文件为准")} icon={Icon.Download} onAction={() => void resolveConflict("file")} />
                  <Action
                    title={t("Use Local Version (overwrite file)", "以本地为准（覆盖文件）")}
                    icon={Icon.Upload}
                    style={Action.Style.Destructive}
                    onAction={() => void resolveConflict("local")}
                  />
                </ActionPanel.Section>
              )}
              <ActionPanel.Section title={t("Accounts", "账户")}>
                <Action title={t("Add Account", "添加账户")} icon={Icon.Plus} onAction={() => push(<AccountForm mode="create" />)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title={t(`Accounts (${vault.accounts.length})`, `账户 (${vault.accounts.length})`)}>
        {vault.accounts.map((account) => (
          <AccountItem key={account.id} account={account} groups={vault.groups} push={push} />
        ))}
      </List.Section>

      <List.Section title={t(`Groups (${vault.groups.length})`, `分组 (${vault.groups.length})`)}>
        <List.Item
          icon={Icon.Plus}
          title={t("New Group", "新建分组")}
          actions={
            <ActionPanel>
              <Action title={t("New Group", "新建分组")} icon={Icon.Plus} onAction={() => push(<GroupForm mode="create" />)} />
            </ActionPanel>
          }
        />
        {vault.groups.map((group) => (
          <List.Item
            key={group.id}
            icon={Icon.Folder}
            title={group.name}
            subtitle={t(`${vault.accounts.filter((account) => account.groupId === group.id).length} accounts`, `${vault.accounts.filter((account) => account.groupId === group.id).length} 个账户`)}
            actions={
              <ActionPanel>
                <Action title={t("Rename Group", "重命名分组")} icon={Icon.Pencil} onAction={() => push(<GroupForm mode="rename" group={group} />)} />
                <Action
                  title={t("Delete Group (accounts become ungrouped)", "删除分组（账户回到未分组）")}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => void commit((snapshot) => removeGroup(snapshot, group.id), t("Group deleted", "已删除分组"))}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={t(`Trash (${vault.trash.length})`, `回收站 (${vault.trash.length})`)}>
        <List.Item
          icon={Icon.Trash}
          title={t("Empty Trash", "清空回收站")}
          subtitle={t("Items older than 30 days are removed on load", "30 天前的条目在每次载入时自动清理")}
          actions={
            <ActionPanel>
              <Action
                title={t("Empty Trash", "清空回收站")}
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                onAction={() => void commit((snapshot) => emptyTrash(snapshot), t("Trash emptied", "回收站已清空"))}
              />
            </ActionPanel>
          }
        />
        {vault.trash.map((account) => (
          <List.Item
            key={account.id}
            icon={Icon.Trash}
            title={account.note || account.name}
            subtitle={t(`${account.issuer} · Deleted ${new Date(account.deletedAt ?? 0).toLocaleString("en-US")}`, `${account.issuer} · 删除于 ${new Date(account.deletedAt ?? 0).toLocaleString("zh-CN")}`)}
            actions={
              <ActionPanel>
                <Action
                  title={t("Restore Account", "恢复账户")}
                  icon={Icon.ArrowCounterClockwise}
                  onAction={() => void commit((snapshot) => restoreFromTrash(snapshot, account.id), t("Account restored", "已恢复账户"))}
                />
                <Action
                  title={t("Delete Permanently", "永久删除")}
                  icon={Icon.DeleteDocument}
                  style={Action.Style.Destructive}
                  onAction={() => void commit((snapshot) => deleteForever(snapshot, account.id), t("Permanently deleted", "已永久删除"))}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      <List.Section title={t("Import & Export", "导入导出")}>
        <List.Item
          icon={Icon.Camera}
          title={t("Scan Screenshot", "截图识码")}
          subtitle={t("Capture and scan QR or migration codes", "截屏识别二维码或迁移码")}
          actions={<ActionPanel><Action.Push title={t("Scan Screenshot", "截图识码")} icon={Icon.Camera} target={<ScanQr />} /></ActionPanel>}
        />
        <List.Item
          icon={Icon.Download}
          title={t("Import from Clipboard", "从剪贴板导入")}
          subtitle={t("Supports otpauth://, Google migration codes and goose-2fa JSON backups", "支持 otpauth://、Google 迁移码与 goose-2fa JSON 备份")}
          actions={
            <ActionPanel>
              <Action
                title={t("Import from Clipboard", "从剪贴板导入")}
                icon={Icon.Download}
                onAction={async () => {
                  const text = await Clipboard.readText();
                  if (!text) {
                    await showToast({ style: Toast.Style.Failure, title: t("Clipboard contains no text", "剪贴板没有文本") });
                    return;
                  }
                  if (!previewImport(text, getVaultState())) {
                    await showToast({ style: Toast.Style.Failure, title: t("Could not parse clipboard content", "无法解析剪贴板内容") });
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
          title={t("Import from File", "从文件导入")}
          actions={
            <ActionPanel>
              <Action title={t("Choose Backup File", "选择备份文件")} icon={Icon.Upload} onAction={() => push(<ImportForm />)} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.SaveDocument}
          title={t("Export to File", "导出到文件")}
          actions={
            <ActionPanel>
              <Action title={t("Choose Export Path", "选择导出路径")} icon={Icon.SaveDocument} onAction={() => push(<ExportForm />)} />
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
          <Action title={t("Edit Note & Name", "编辑备注与名称")} icon={Icon.Pencil} onAction={() => push(<AccountForm mode="edit" account={account} />)} />
          <ActionPanel.Section title={t("Move to Group", "移动到分组")}>
            <Action
              title={t("Ungrouped", "未分组")}
              icon={Icon.Folder}
              onAction={() => void commit((snapshot) => setAccountGroup(snapshot, account.id, null), t("Account moved", "已移动账户"))}
            />
            {groups.map((group) => (
              <Action
                key={group.id}
                title={group.name}
                icon={Icon.Folder}
                onAction={() => void commit((snapshot) => setAccountGroup(snapshot, account.id, group.id), t("Account moved", "已移动账户"))}
              />
            ))}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={t("Move to Trash", "移入回收站")}
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => void commit((snapshot) => moveToTrash(snapshot, account.id), t("Moved to Trash", "已移入回收站"))}
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
      navigationTitle={mode === "create" ? t("Add Account", "添加账户") : t("Edit Account", "编辑账户")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? t("Add", "添加") : t("Save", "保存")}
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
                  await showToast({ style: Toast.Style.Failure, title: t("Invalid account details", "账户信息不合法"), message: t("Check the Base32 secret, digits and period.", "请检查 Base32 密钥、位数与周期。") });
                  return;
                }
                const groupId = values.group === UNGROUPED ? null : values.group;
                const ok = await commit((snapshot) => addAccounts(snapshot, [input], groupId ?? null), t("Account added", "已添加账户"));
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
                t("Account saved", "已保存账户"),
              );
              if (ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t("Name", "名称")} defaultValue={account?.name} placeholder="alice@example.com" />
      <Form.TextField id="issuer" title={t("Issuer", "发行方")} defaultValue={account?.issuer} placeholder="GitHub" />
      {mode === "create" && (
        <Form.TextField id="secret" title={t("Base32 Secret", "Base32 密钥")} placeholder="JBSWY3DPEHPK3PXP" />
      )}
      {mode === "create" && (
        <Form.Dropdown id="type" title={t("Type", "类型")} defaultValue="totp">
          <Form.Dropdown.Item value="totp" title={t("TOTP (time-based)", "TOTP（基于时间）")} />
          <Form.Dropdown.Item value="hotp" title={t("HOTP (counter-based)", "HOTP（基于计数器）")} />
        </Form.Dropdown>
      )}
      {mode === "create" && (
        <Form.Dropdown id="digits" title={t("Digits", "位数")} defaultValue="6">
          <Form.Dropdown.Item value="6" title={t("6 digits", "6 位")} />
          <Form.Dropdown.Item value="8" title={t("8 digits", "8 位")} />
        </Form.Dropdown>
      )}
      {mode === "create" && <Form.TextField id="period" title={t("Period (seconds)", "周期（秒）")} defaultValue="30" />}
      {mode === "create" && (
        <Form.Dropdown id="algorithm" title={t("Algorithm", "算法")} defaultValue="SHA-1">
          <Form.Dropdown.Item value="SHA-1" title="SHA-1" />
          <Form.Dropdown.Item value="SHA-256" title="SHA-256" />
          <Form.Dropdown.Item value="SHA-512" title="SHA-512" />
        </Form.Dropdown>
      )}
      <Form.TextArea id="note" title={t("Note", "备注")} defaultValue={account?.note} />
      <Form.TextArea id="remark" title={t("Remark", "标记")} defaultValue={account?.remark} />
    </Form>
  );
}

function GroupForm({ mode, group }: { mode: "create" | "rename"; group?: VaultGroup }) {
  const { pop } = useNavigation();
  return (
    <Form
      navigationTitle={mode === "create" ? t("New Group", "新建分组") : t("Rename Group", "重命名分组")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={mode === "create" ? t("Create", "新建") : t("Save", "保存")}
            onSubmit={async (values: FormValues) => {
              const name = values.name ?? "";
              const ok = mode === "create"
                ? await commit((snapshot) => addGroup(snapshot, name).snapshot, t("Group created", "已新建分组"))
                : await commit((snapshot) => renameGroup(snapshot, group?.id ?? "", name), t("Group renamed", "已重命名分组"));
              if (ok) pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="name" title={t("Group Name", "分组名")} defaultValue={group?.name} placeholder={t("Work", "工作")} />
    </Form>
  );
}

function ImportForm() {
  const { push } = useNavigation();
  return (
    <Form
      navigationTitle={t("Import from File", "从文件导入")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("Import", "导入")}
            onSubmit={async (values: FormValues) => {
              const target = normalizePath(values.path ?? "");
              if (!target) return;
              let text: string;
              try {
                if (statSync(target).size > 5 * 1024 * 1024) throw new Error(t("Backup exceeds 5 MB", "备份文件超过 5MB"));
                text = readFileSync(target, "utf8");
              } catch {
                await showToast({ style: Toast.Style.Failure, title: t("Could Not Read File", "无法读取文件"), message: t("Check the path, permissions and 5 MB limit.", "请检查文件路径、权限和 5MB 大小限制。") });
                return;
              }
              if (!previewImport(text, getVaultState())) {
                await showToast({ style: Toast.Style.Failure, title: t("Could not parse backup file", "无法解析备份文件") });
                return;
              }
              push(<ImportPreview text={text} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="path" title={t("Backup File Path", "备份文件路径")} placeholder="~/Downloads/goose-2fa-backup.json" />
    </Form>
  );
}

function ImportPreview({ text }: { text: string }) {
  const { pop } = useNavigation();
  const preview = previewImport(text, getVaultState());
  if (!preview) return <List.EmptyView title={t("Could Not Parse Backup", "备份无法解析")} />;
  const current = getVaultState();
  const imported = preview.snapshot.accounts.slice(current.accounts.length);
  const groupCount = preview.snapshot.groups.length - current.groups.length;
  return (
    <List navigationTitle={t("Import Preview", "导入预览")} searchBarPlaceholder={t("Search accounts to import", "搜索待导入账户")}>
      <List.Section title={t(`Accounts: ${preview.added} new, ${preview.dupeCount} duplicates skipped`, `账户：新增 ${preview.added}，重复跳过 ${preview.dupeCount}`)}>
        {imported.map((account: NewAccountInput, index) => (
          <List.Item key={`${account.issuer}:${account.name}:${index}`} icon={Icon.Key} title={account.note || account.name} subtitle={account.issuer} />
        ))}
      </List.Section>
      <List.Section title={t(`${groupCount} groups will be added`, `将新增 ${groupCount} 个分组`)}>
        {preview.snapshot.groups.slice(current.groups.length).map((group) => <List.Item key={group.id} icon={Icon.Folder} title={group.name} />)}
      </List.Section>
      <List.Item
        icon={Icon.Warning}
        title={t("Confirm Import", "确认导入")}
        subtitle={t("Secrets are hidden; they will be available in your local data source after import.", "验证码密钥不会显示；导入后可在本机数据源中查看。")}
        actions={<ActionPanel><Action title={t(`Import ${preview.added} accounts`, `导入 ${preview.added} 个账户`)} icon={Icon.Download} onAction={async () => {
          const currentPreview = previewImport(text, getVaultState());
          if (!currentPreview) {
            await showToast({ style: Toast.Style.Failure, title: t("Could Not Parse Backup", "备份无法解析") });
            return;
          }
          const ok = await commit(() => currentPreview.snapshot, t(`Imported ${currentPreview.added} accounts`, `已导入 ${currentPreview.added} 个账户`));
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
      navigationTitle={t("Export to File", "导出到文件")}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={t("Export", "导出")}
            onSubmit={async () => {
              const target = normalizePath(path);
              if (!target) return;
              const snapshot = getVaultState();
              try {
                writeBackupFile(target, exportAsSyncJson(snapshot.accounts, snapshot.groups, snapshot.trash));
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("Export Failed", "导出失败"),
                  message: error instanceof Error ? error.message : String(error),
                });
                return;
              }
              await showToast({ style: Toast.Style.Success, title: t("Full backup exported", "已导出完整备份"), message: target });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="path" title={t("Export Path", "导出路径")} value={path} onChange={setPath} />
      <Form.Description text={t("The full data source (including IDs and trash) can be used as a data source on another device.", "导出的是完整数据源格式（含 id 与回收站），可直接作为另一台设备的数据源文件。")} />
    </Form>
  );
}

const UNGROUPED = "__ungrouped__";

function CreateSourceForm() {
  const { pop } = useNavigation();
  return <Form navigationTitle={t("Create Data Source at Location", "指定位置新建数据源")} actions={<ActionPanel><Action.SubmitForm title={t("Create and Use This File", "新建并使用此文件")} onSubmit={async (values: { directory?: string[]; fileName?: string }) => {
    const directory = values.directory?.[0];
    const name = values.fileName?.trim() || "goose-2fa.json";
    if (!directory || !path.isAbsolute(directory) || !/^[^/\\\0]+\.json$/i.test(name)) {
      await showToast({ style: Toast.Style.Failure, title: t("Choose a folder and enter a .json filename", "请选择目录并填写 .json 文件名") });
      return;
    }
    try {
      if (!statSync(directory).isDirectory()) throw new Error(t("Folder does not exist", "目录不存在"));
      const target = resolveVaultPath(path.join(realpathSync.native(directory), name));
      if (getVaultState().localBroken) throw new Error(t("Local vault is corrupted; incomplete data cannot be written to a new file", "本地库已损坏；不能把不完整数据写成新文件"));
      const current = getVaultState();
      const result = await writeVaultFile(target, exportAsSyncJson(current.accounts, current.groups, current.trash), null, true);
      if (result.status !== "ok") throw new Error(result.status === "conflict" ? t("File already exists; select it in extension preferences", "文件已存在，请在扩展设置中选择它") : t("Could not create file; check folder permissions or write lock", "无法创建文件，请检查目录权限或写入锁"));
      await selectCreatedSource(target);
      await showToast({ style: Toast.Style.Success, title: t("Data source created", "已新建数据源"), message: target });
      pop();
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: t("Creation Failed", "新建失败"), message: error instanceof Error ? error.message : String(error) });
    }
  }} /></ActionPanel>}>
    <Form.FilePicker id="directory" title={t("Save Folder", "保存目录")} allowMultipleSelection={false} canChooseDirectories canChooseFiles={false} />
    <Form.TextField id="fileName" title={t("Filename", "文件名")} defaultValue="goose-2fa.json" />
    <Form.Description text={t("File contains plaintext 2FA secrets. Select the same iCloud file on another computer to sync. Existing files are never overwritten.", "文件含明文 2FA 密钥；在另一台电脑选择同一 iCloud 文件即可读取。已有文件不会被覆盖。")} />
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
