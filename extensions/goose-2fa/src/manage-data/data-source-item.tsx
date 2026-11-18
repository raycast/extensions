import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
  type useNavigation,
} from "@raycast/api";
import AccountForm from "../account-form";
import { syncStatus, t } from "../lib/i18n";
import {
  clearCreatedSource,
  clearSyncLock,
  createDataSource,
  getVaultState,
  refreshVault,
  resetLocalVault,
  resolveConflict,
  type VaultState,
} from "../lib/vault-store";
import CreateSourceForm from "./create-source-form";

export default function DataSourceItem({
  vault,
  push,
}: {
  vault: VaultState;
  push: ReturnType<typeof useNavigation>["push"];
}) {
  return (
    <List.Item
      icon={vault.source === "file" ? Icon.HardDrive : Icon.Desktop}
      title={
        vault.source === "file"
          ? vault.filePath
          : t("No file configured; using Raycast Local Vault", "未配置文件，使用 Raycast 本地库")
      }
      subtitle={
        vault.message ??
        vault.notice ??
        t(`Sync status: ${syncStatus(vault.syncStatus)}`, `同步状态：${syncStatus(vault.syncStatus)}`)
      }
      accessories={
        vault.conflict ? [{ text: t("Conflict Needs Resolution", "冲突待处理"), icon: Icon.Warning }] : undefined
      }
      actions={
        <ActionPanel>
          {vault.source === "file" ? (
            <Action
              title={t("Reload Data Source", "重新读取数据源文件")}
              icon={Icon.ArrowClockwise}
              onAction={() => void refreshVault()}
            />
          ) : (
            <Action.Push
              title={t("Save Current Data as a Sync File", "保存当前数据为同步文件")}
              icon={Icon.SaveDocument}
              target={<CreateSourceForm />}
            />
          )}
          <Action
            title={t("Open Extension Preferences", "打开扩展设置")}
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          {vault.source === "file" && (
            <Action.Push
              title={t("Save Current Data as a Sync File", "保存当前数据为同步文件")}
              icon={Icon.SaveDocument}
              target={<CreateSourceForm />}
            />
          )}
          <Action
            title={t("Use File or Local Vault from Extension Preferences", "改用扩展设置选择的文件或本地库")}
            icon={Icon.ArrowCounterClockwise}
            onAction={() => void clearCreatedSource()}
          />
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
                      : {
                          style: Toast.Style.Failure,
                          title: t("Local vault not rebuilt", "本地库未重建"),
                          message: getVaultState().message ?? t("Please try again.", "请重试。"),
                        },
                  );
                }}
              />
            </ActionPanel.Section>
          )}
          {vault.lockHeld !== null && (
            <ActionPanel.Section title={t("Stale Lock", "残留锁")}>
              <Action
                title={t(
                  "Remove Stale Lock (ensure no other client is writing)",
                  "清理残留锁文件（确认没有其他端在写）",
                )}
                icon={Icon.LockUnlocked}
                style={Action.Style.Destructive}
                onAction={async () => {
                  const removed = await clearSyncLock();
                  await showToast(
                    removed
                      ? {
                          style: Toast.Style.Success,
                          title: t("Stale lock removed", "已清理残留锁"),
                          message: t("Please retry your last change.", "请重新执行刚才的改动。"),
                        }
                      : {
                          style: Toast.Style.Failure,
                          title: t("Lock file not found", "没有找到锁文件"),
                          message: t("It may have been released by its owner.", "可能已被持有者释放。"),
                        },
                  );
                }}
              />
            </ActionPanel.Section>
          )}
          {vault.conflict && (
            <ActionPanel.Section title={t("Conflict", "冲突")}>
              <Action
                title={t("Use File Version", "以文件为准")}
                icon={Icon.Download}
                onAction={() => void resolveConflict("file")}
              />
              <Action
                title={t("Use Local Version (overwrite file)", "以本地为准（覆盖文件）")}
                icon={Icon.Upload}
                style={Action.Style.Destructive}
                onAction={() => void resolveConflict("local")}
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section title={t("Accounts", "账户")}>
            <Action
              title={t("Add Account", "添加账户")}
              icon={Icon.Plus}
              onAction={() => push(<AccountForm mode="create" />)}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
