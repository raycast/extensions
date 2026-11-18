import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { useEffect, useState } from "react";
import {
  diffEnvVariables,
  isEncryptedValue,
  isSecretKey,
  maskSecret,
  parseEnv,
  type ProjectMeta,
} from "@env-keeper/core";
import { snapshotLimitHint, t } from "../i18n.js";
import { confirmDestructive } from "./confirmDestructive.js";
import { showFailureToast } from "./failureToast.js";
import { runLoad } from "./loadState.js";
import { formatFileSize } from "./fileSize.js";
import { prettyTimestamp } from "./timeFormat.js";
import { deleteSnapshot, listSnapshots, restoreSnapshot, type SnapshotItem } from "../services/storage.js";
import { diffSection, formatEnvDiff } from "./diffFormat.js";
import { SnapshotCleanupForm } from "./SnapshotCleanupForm.js";

interface SnapshotHistoryViewProps {
  project: Pick<ProjectMeta, "id" | "name">;
  envFilename: string;
  envFilePath: string;
  /** 当前(磁盘上最新保存)的完整文件内容,用于跟快照做差异对比 */
  currentContent: string;
  customSecrets?: string[];
  onRestored: () => void;
}

export function SnapshotHistoryView({
  project,
  envFilename,
  envFilePath,
  currentContent,
  customSecrets,
  onRestored,
}: SnapshotHistoryViewProps) {
  const { pop } = useNavigation();
  const [snapshots, setSnapshots] = useState<SnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string>("");
  /** 选中项再往前一份的内容;null 表示这已经是最早的一份 */
  const [prevContent, setPrevContent] = useState<string | null>(null);

  // 选中哪份就读哪份,顺带把更早的一份也读进来——差异区要回答的第一个问题是
  // "这一次保存到底改了什么",只跟当前文件比是答不出来的
  const loadPreview = async (list: SnapshotItem[], item: SnapshotItem) => {
    setSelectedSnapshot(item);
    try {
      setPreviewContent(await readFile(item.filePath, "utf8"));
    } catch {
      setPreviewContent(t("sh.unreadableContent"));
    }

    const idx = list.findIndex((s) => s.filename === item.filename);
    const older = idx >= 0 ? list[idx + 1] : undefined;
    if (!older) {
      setPrevContent(null);
      return;
    }
    try {
      setPrevContent(await readFile(older.filePath, "utf8"));
    } catch {
      setPrevContent(null);
    }
  };

  /** 重新读列表。选中项已经不在列表里(刚被删掉)时,右侧不能还停在它上面,重选第一份 */
  const refreshSnapshots = (current: SnapshotItem | null = selectedSnapshot) =>
    runLoad(
      setLoading,
      async () => {
        const items = await listSnapshots(project, envFilename);
        setSnapshots(items);
        const stillThere = current && items.some((s) => s.filename === current.filename);
        const first = items[0];
        if (!stillThere) {
          if (first) await loadPreview(items, first);
          else {
            setSelectedSnapshot(null);
            setPreviewContent("");
            setPrevContent(null);
          }
        }
      },
      "sh.loadFailedTitle",
    );

  useEffect(() => {
    refreshSnapshots();
  }, [project.id, envFilename]);

  const handleSelectionChange = async (id: string | null) => {
    const item = snapshots.find((s) => s.filename === id);
    if (item) await loadPreview(snapshots, item);
  };

  const handleRestore = async (item: SnapshotItem) => {
    const confirmed = await confirmDestructive({
      title: t("sh.restoreConfirmTitle", { timestamp: prettyTimestamp(item.timestampStr) }),
      message: t("sh.restoreConfirmMessage", { file: envFilename }),
      actionTitle: t("sh.restoreConfirmAction"),
    });

    if (!confirmed) return;

    try {
      const result = await restoreSnapshot({
        project,
        snapshotFilePath: item.filePath,
        targetEnvFilePath: envFilePath,
      });

      if (result.success) {
        await showToast({
          style: Toast.Style.Success,
          title: t("sh.restoredToast"),
          message: snapshotLimitHint(result),
        });
        onRestored();
        pop();
      } else {
        await showToast({ style: Toast.Style.Failure, title: t("sh.restoreFailedTitle"), message: result.error });
      }
    } catch (e) {
      await showFailureToast(t("sh.restoreErrorTitle"), e);
    }
  };

  const handleDelete = async (item: SnapshotItem) => {
    const confirmed = await confirmDestructive({
      title: t("sh.deleteConfirmTitle"),
      message: t("sh.deleteConfirmMessage", { filename: item.filename }),
      actionTitle: t("common.delete"),
    });
    if (!confirmed) return;

    await deleteSnapshot(item.filePath);
    await showToast({ style: Toast.Style.Success, title: t("sh.deletedToast") });
    await refreshSnapshots(selectedSnapshot?.filename === item.filename ? null : selectedSnapshot);
  };

  const displayVal = (key: string, value: string | undefined) => {
    if (value === undefined) return "";
    // 跟共用的 envValueDisplayer 一致:名字、值、加密前缀三种都判
    return isSecretKey(key, customSecrets, value) || isEncryptedValue(value) ? maskSecret(value) : value;
  };

  // 快照内容:注释行、空行原样保留(比结构化展示更贴近原文),只把敏感值打码——
  // 跟 App 其他地方一致,不在这里把密钥明文倒出来。
  const contentText = parseEnv(previewContent)
    .map((line) => {
      if (line.type !== "kv") return line.raw.trimEnd();
      return `${line.disabled ? "# " : ""}${line.key}=${displayVal(line.key, line.value)}`;
    })
    .join("\n");

  const show = (key: string, value: string) => displayVal(key, value);

  // 上一份(更早) → 这一份:这一次保存改了什么
  const diffFromPrev =
    prevContent === null
      ? t("diff.noPrev")
      : formatEnvDiff(diffEnvVariables(parseEnv(prevContent), parseEnv(previewContent)), show);

  // 这一份 → 当前文件:从这份记录到现在发生了什么
  const diffToCurrent = formatEnvDiff(diffEnvVariables(parseEnv(previewContent), parseEnv(currentContent)), show);

  // 信息行不用 markdown 列表:`- ` 会被渲染成主题色圆点,红色在界面里通常意味着错误
  const buildMarkdown = (item: SnapshotItem): string =>
    [
      `### ${t("sh.infoHeading")}`,
      "",
      `**${t("sh.infoTargetFile")}**: \`${item.envFilename}\``,
      "",
      `**${t("sh.infoRecordedAt")}**: \`${prettyTimestamp(item.timestampStr)}\``,
      "",
      `**${t("sh.infoFileSize")}**: \`${formatFileSize(item.size)}\``,
      "",
      "---",
      "",
      diffSection("fromPrev", diffFromPrev),
      "",
      "---",
      "",
      diffSection("toCurrent", diffToCurrent),
      "",
      "---",
      "",
      `### ${t("sh.contentHeading")}`,
      "",
      contentText.trim() ? `\`\`\`dotenv\n${contentText}\n\`\`\`` : t("sh.contentEmpty"),
    ].join("\n");

  return (
    <List
      isLoading={loading}
      isShowingDetail={snapshots.length > 0}
      onSelectionChange={handleSelectionChange}
      searchBarPlaceholder={t("sh.searchPlaceholder")}
    >
      <List.Section
        title={t("sh.sectionTitle", { file: envFilename })}
        subtitle={t("sh.sectionSubtitle", { count: snapshots.length })}
      >
        {snapshots.map((item) => (
          <List.Item
            key={item.filename}
            id={item.filename}
            icon={Icon.Clock}
            title={prettyTimestamp(item.timestampStr)}
            // 只算选中项:此前每行都跑一遍 buildMarkdown(内含 4 次解析 + 2 次 diff),
            // 快照一多,滚动就卡。跟 Shell 配置历史页同一个写法
            detail={
              <List.Item.Detail markdown={selectedSnapshot?.filename === item.filename ? buildMarkdown(item) : ""} />
            }
            actions={
              <ActionPanel>
                <Action title={t("sh.actionRestore")} icon={Icon.Undo} onAction={() => handleRestore(item)} />
                {/* 快照是 .env 文件原文,里面是明文密钥 */}
                <Action.CopyToClipboard title={t("sh.actionCopyContent")} content={previewContent} concealed />
                <Action
                  title={t("sh.actionDelete")}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(item)}
                />
                <Action.Push
                  title={t("sh.actionCleanup")}
                  icon={Icon.DeleteDocument}
                  target={
                    <SnapshotCleanupForm
                      navTitle={t("sh.cleanupNavTitle")}
                      unit={t("sh.cleanupUnit")}
                      description={t("sh.cleanupDescription", { file: envFilename })}
                      snapshots={snapshots}
                      onDelete={deleteSnapshot}
                      onCleaned={() => refreshSnapshots(null)}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {snapshots.length === 0 && <List.EmptyView title={t("sh.emptyTitle")} description={t("sh.emptyDesc")} />}
    </List>
  );
}
