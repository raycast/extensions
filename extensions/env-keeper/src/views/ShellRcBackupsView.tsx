import { Action, ActionPanel, Form, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import { maskShellContent } from "@env-keeper/core";
import { t } from "../i18n.js";
import { confirmDestructive } from "./confirmDestructive.js";
import { showFailureToast } from "./failureToast.js";
import { runLoad } from "./loadState.js";
import { formatFileSize } from "./fileSize.js";
import { prettyTimestamp } from "./timeFormat.js";
import {
  backupShellRcTo,
  deleteShellRcBackup,
  getBackupsDir,
  listShellRcBackups,
  readShellRcBackup,
  restoreShellRcBackup,
  type RcBackupItem,
  type ShellRcInfo,
} from "../services/storage.js";

/** 20260906-143000 → 2026-09-06 14:30:00 */

/** 备份到自选目录:留空就用扩展自己的备份目录 */
function BackupToForm({ rcInfo, onDone }: { rcInfo: ShellRcInfo; onDone: () => void }) {
  const { pop } = useNavigation();
  const [dirs, setDirs] = useState<string[]>([]);

  const handleSubmit = async () => {
    try {
      const path = await backupShellRcTo(rcInfo.rcPath, dirs[0]);
      await showToast({ style: Toast.Style.Success, title: t("rcb.backedUpToast"), message: path });
      onDone();
      pop();
    } catch (e) {
      await showFailureToast(t("rcb.backupFailedTitle"), e);
    }
  };

  return (
    <Form
      navigationTitle={t("rcb.backupToNavTitle")}
      actions={
        <ActionPanel>
          <Action.SubmitForm title={t("rcb.backupSubmit")} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={t("rcb.backupToDescription", { file: rcInfo.rcLabel, dir: getBackupsDir() })} />
      <Form.FilePicker
        id="dir"
        title={t("rcb.backupToDirTitle")}
        value={dirs}
        onChange={setDirs}
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        info={t("rcb.backupToDirInfo")}
      />
    </Form>
  );
}

/**
 * `.zshrc` 备份列表。
 *
 * 这些副本一直都在(接入 / 移除 Shell 集成时各存一份),但界面上从没提过——
 * 用户不知道存在的保险等于没有保险。顺便把"我现在想手动存一份"这件事也接上:
 * 改 shell 配置前想留个后路,不该逼人开终端敲 cp。
 *
 * 跟「Shell 配置历史」是两回事:那边管的是扩展自己的 shell.json(片段),
 * 这边是你自己那份 .zshrc 的原样副本。
 */
export function ShellRcBackupsView({ rcInfo }: { rcInfo: ShellRcInfo }) {
  const [items, setItems] = useState<RcBackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string>("");
  // .zshrc 里同样可能写着密钥,默认打码,跟 Shell 轨的行为一致
  const [reveal, setReveal] = useState(false);

  const refresh = () =>
    runLoad(
      setLoading,
      async () => {
        setItems(await listShellRcBackups());
      },
      "rcb.loadFailedTitle",
    );

  useEffect(() => {
    refresh();
  }, []);

  const handleSelectionChange = async (id: string | null) => {
    setSelectedId(id);
    const item = items.find((i) => i.filename === id);
    if (!item) return;
    try {
      setPreview(await readShellRcBackup(item.filePath));
    } catch {
      setPreview(t("rcb.unreadable"));
    }
  };

  const handleBackupNow = async () => {
    try {
      const path = await backupShellRcTo(rcInfo.rcPath);
      await showToast({ style: Toast.Style.Success, title: t("rcb.backedUpToast"), message: path });
      await refresh();
    } catch (e) {
      await showFailureToast(t("rcb.backupFailedTitle"), e);
    }
  };

  const handleRestore = async (item: RcBackupItem) => {
    const confirmed = await confirmDestructive({
      title: t("rcb.restoreConfirmTitle", { time: prettyTimestamp(item.timestampStr) }),
      message: t("rcb.restoreConfirmMessage", { file: rcInfo.rcLabel }),
      actionTitle: t("rcb.restoreConfirmAction"),
    });
    if (!confirmed) return;

    try {
      const { safetyBackupPath } = await restoreShellRcBackup(item.filePath, rcInfo.rcPath);
      await showToast({
        style: Toast.Style.Success,
        title: t("rcb.restoredToast", { file: rcInfo.rcLabel }),
        message: safetyBackupPath ? t("rcb.restoredSafetyNote", { path: safetyBackupPath }) : undefined,
      });
      await refresh();
    } catch (e) {
      await showFailureToast(t("rcb.restoreFailedTitle"), e);
    }
  };

  const handleDelete = async (item: RcBackupItem) => {
    const confirmed = await confirmDestructive({
      title: t("rcb.deleteConfirmTitle"),
      message: t("rcb.deleteConfirmMessage", { filename: item.filename }),
      actionTitle: t("common.delete"),
    });
    if (!confirmed) return;
    await deleteShellRcBackup(item.filePath);
    await showToast({ style: Toast.Style.Success, title: t("rcb.deletedToast") });
    await refresh();
  };

  const buildMarkdown = (item: RcBackupItem): string =>
    [
      `### ${t("rcb.infoHeading")}`,
      "",
      `**${t("rcb.infoOrigin")}**: \`${item.originName}\``,
      "",
      `**${t("rcb.infoRecordedAt")}**: \`${prettyTimestamp(item.timestampStr)}\``,
      "",
      `**${t("rcb.infoFileSize")}**: \`${formatFileSize(item.size)}\``,
      "",
      "---",
      "",
      `### ${t("rcb.contentHeading")}`,
      "",
      preview.trim() === ""
        ? t("rcb.contentEmpty")
        : `\`\`\`bash\n${reveal ? preview : maskShellContent(preview)}\n\`\`\``,
    ].join("\n");

  // "再备份一份"放到单独一组:选中某份备份按回车,要的是"恢复它",不是又存一份
  const sharedActions = (
    <ActionPanel.Section title={t("rcb.sectionBackup")}>
      <Action
        title={t("rcb.actionBackupNow", { file: rcInfo.rcLabel })}
        icon={Icon.SaveDocument}
        onAction={handleBackupNow}
      />
      <Action.Push
        title={t("rcb.actionBackupTo")}
        icon={Icon.Folder}
        target={<BackupToForm rcInfo={rcInfo} onDone={refresh} />}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={loading}
      isShowingDetail={items.length > 0}
      onSelectionChange={handleSelectionChange}
      navigationTitle={t("rcb.navTitle", { file: rcInfo.rcLabel })}
      searchBarPlaceholder={t("rcb.searchPlaceholder")}
    >
      <List.Section title={t("rcb.sectionTitle")} subtitle={t("rcb.sectionSubtitle", { count: items.length })}>
        {items.map((item) => (
          <List.Item
            key={item.filename}
            id={item.filename}
            icon={Icon.Clock}
            title={prettyTimestamp(item.timestampStr)}
            subtitle={item.originName}
            detail={<List.Item.Detail markdown={selectedId === item.filename ? buildMarkdown(item) : ""} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  {/* 回车 = 恢复这份备份(有确认框):这一页就是为了它存在的 */}
                  <Action
                    title={t("rcb.actionRestore", { file: rcInfo.rcLabel })}
                    icon={Icon.Undo}
                    style={Action.Style.Destructive}
                    onAction={() => handleRestore(item)}
                  />
                  <Action
                    title={reveal ? t("st.actionHideSecrets") : t("st.actionRevealSecrets")}
                    icon={reveal ? Icon.EyeDisabled : Icon.Eye}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                    onAction={() => setReveal((v) => !v)}
                  />
                  <Action.ShowInFinder title={t("rcb.actionShowInFinder")} path={item.filePath} />
                </ActionPanel.Section>
                {sharedActions}
                <ActionPanel.Section>
                  <Action
                    title={t("rcb.actionDelete")}
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(item)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {items.length === 0 && !loading && (
        <List.EmptyView
          title={t("rcb.emptyTitle")}
          description={t("rcb.emptyDesc", { file: rcInfo.rcLabel })}
          actions={<ActionPanel>{sharedActions}</ActionPanel>}
        />
      )}
    </List>
  );
}
