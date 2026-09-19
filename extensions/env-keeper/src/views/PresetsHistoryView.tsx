import { Action, ActionPanel, Alert, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  createEmptyPresetsFile,
  diffEnvVariables,
  formatPresetsFile,
  groupPresets,
  listPresetsForProject,
  parseEnv,
  parsePresetsFile,
  type Preset,
  type PresetsFile,
  restorePreset,
  restoreProjectPresets,
} from "@env-keeper/core";
import { snapshotLimitHint, t } from "../i18n.js";
import { confirmDestructive } from "./confirmDestructive.js";
import { showFailureToast } from "./failureToast.js";
import { runLoad } from "./loadState.js";
import { prettyTimestamp } from "./timeFormat.js";
import {
  type ConfigSnapshotItem,
  deleteConfigSnapshot,
  listConfigSnapshots,
  loadPresets,
  readConfigSnapshot,
  savePresets,
} from "../services/storage.js";
import { cleanProjectPresetHistory } from "../services/presetsHistory.js";
import { diffBlock, envValueDisplayer, formatEnvContentMasked, formatEnvDiff } from "./diffFormat.js";
import { SnapshotCleanupForm } from "./SnapshotCleanupForm.js";

interface PresetsHistoryViewProps {
  projectId: string;
  projectName: string;
  customSecrets?: string[];
  onRestored: () => void;
  /** 只看某一份方案的变更历史,恢复也只恢复这一份 */
  focusPreset?: { id: string; name: string };
}

function samePreset(a: Preset | undefined, b: Preset | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.name === b.name && a.note === b.note && a.group === b.group && a.content === b.content;
}

/** 两个版本里,本项目的方案集合是否一模一样 */
function sameProjectPresets(a: Preset[], b: Preset[]): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((p) => [p.id, p]));
  return a.every((p) => samePreset(p, byId.get(p.id)));
}

/**
 * 方案的历史,**按项目看**。presets.json 是全局一份、只有一条历史线,
 * 但用户永远是从某个项目进来的:列表只留本项目有变动的版本,恢复也只换回本项目的方案。
 *
 * 恢复不像 Shell 片段历史那样必须整份:片段之间有依赖(PATH 引用 JAVA_HOME),
 * 方案彼此独立、每份都是完整的 .env 内容,所以单份视图只恢复那一份,项目视图只恢复本项目
 */
export function PresetsHistoryView({
  projectId,
  projectName,
  customSecrets,
  onRestored,
  focusPreset,
}: PresetsHistoryViewProps) {
  const { pop } = useNavigation();
  const [items, setItems] = useState<ConfigSnapshotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** 每一版的原文。要判断哪几版动过本项目,必须把每一版都读出来 */
  const [allContents, setAllContents] = useState<Map<string, string>>(new Map());
  const [currentFile, setCurrentFile] = useState<PresetsFile | null>(null);

  const refresh = () =>
    runLoad(
      setLoading,
      async () => {
        const list = await listConfigSnapshots("presets");
        setItems(list);
        const map = new Map<string, string>();
        await Promise.all(
          list.map(async (i) => {
            try {
              map.set(i.filename, await readConfigSnapshot(i.filePath));
            } catch {
              // 单份读不出来不影响其他版本
            }
          }),
        );
        setAllContents(map);
        const { data } = await loadPresets();
        setCurrentFile(data);
      },
      "psh.loadFailedTitle",
    );

  useEffect(() => {
    refresh();
  }, [projectId, focusPreset?.id]);

  const parseOrNull = (text: string | undefined): PresetsFile | null => {
    if (!text) return null;
    try {
      return parsePresetsFile(text);
    } catch {
      return null;
    }
  };

  const projectPresetsIn = (text: string | undefined): Preset[] => {
    const file = parseOrNull(text);
    return file ? listPresetsForProject(file, projectId) : [];
  };
  const focusIn = (text: string | undefined): Preset | undefined =>
    focusPreset ? projectPresetsIn(text).find((p) => p.id === focusPreset.id) : undefined;

  // 只留"这一版动过本项目(或这份方案)"的记录
  const visibleItems = items.filter((item, idx) => {
    const here = allContents.get(item.filename);
    const olderItem = items[idx + 1];
    const older = olderItem ? allContents.get(olderItem.filename) : undefined;
    // 读不出来的版本照样列出来,详情里会如实说"读不出来"
    if (here !== undefined && parseOrNull(here) === null) return true;
    return focusPreset
      ? !samePreset(focusIn(here), focusIn(older))
      : !sameProjectPresets(projectPresetsIn(here), projectPresetsIn(older));
  });

  const prevTextOf = (item: ConfigSnapshotItem): string | null => {
    const idx = visibleItems.findIndex((i) => i.filename === item.filename);
    const older = visibleItems[idx + 1];
    return older ? (allContents.get(older.filename) ?? null) : null;
  };

  const handleRestore = async (item: ConfigSnapshotItem) => {
    const file = parseOrNull(allContents.get(item.filename));
    if (!file || !currentFile) {
      await showToast({ style: Toast.Style.Failure, title: t("psh.restoreFailedTitle"), message: t("psh.unreadable") });
      return;
    }
    const snapshotPreset = focusPreset ? file.presets.find((p) => p.id === focusPreset.id) : undefined;
    if (focusPreset && !snapshotPreset) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("psh.restoreFailedTitle"),
        message: t("psh.focusAbsent"),
      });
      return;
    }

    const confirmed = await confirmAlert({
      title: focusPreset
        ? t("psh.focusRestoreConfirmTitle", { name: focusPreset.name, time: prettyTimestamp(item.timestampStr) })
        : t("psh.restoreConfirmTitle", { time: prettyTimestamp(item.timestampStr) }),
      message: focusPreset
        ? t("psh.focusRestoreConfirmMessage")
        : t("psh.restoreConfirmMessage", { project: projectName }),
      primaryAction: { title: t("psh.restoreConfirmAction"), style: Alert.ActionStyle.Destructive },
      dismissAction: { title: t("common.cancel") },
    });
    if (!confirmed) return;

    try {
      // 以现在的文件为底,只换回该换的部分。savePresets 会先把"现在"存成一份新记录,恢复本身也可撤销
      const next =
        focusPreset && snapshotPreset
          ? restorePreset(currentFile, snapshotPreset, new Date(), file)
          : restoreProjectPresets(currentFile, file, projectId);
      const snapshot = await savePresets(next);
      await showToast({
        style: Toast.Style.Success,
        title: t("psh.restoredToast"),
        message: snapshotLimitHint(snapshot),
      });
      onRestored();
      pop();
    } catch (e) {
      await showFailureToast(t("psh.restoreFailedTitle"), e);
    }
  };

  const handleDelete = async (item: ConfigSnapshotItem) => {
    const confirmed = await confirmDestructive({
      title: t("psh.deleteConfirmTitle"),
      message: t("psh.deleteConfirmMessage", { filename: item.filename }),
      actionTitle: t("common.delete"),
    });
    if (!confirmed) return;
    await deleteConfigSnapshot(item.filePath);
    await showToast({ style: Toast.Style.Success, title: t("psh.deletedToast") });
    await refresh();
  };

  const show = envValueDisplayer(customSecrets);

  /** 这一版里本项目的那部分。整份文件装着所有项目的方案,"复制这一版"不该把别的项目的密钥一起带走 */
  const projectSliceText = (item: ConfigSnapshotItem): string => {
    const file = parseOrNull(allContents.get(item.filename));
    if (!file) return "";
    return formatPresetsFile(restoreProjectPresets(createEmptyPresetsFile(), file, projectId));
  };

  /** 单份方案在两个版本之间:新增、删除、改了什么 */
  const focusDiff = (from: Preset | undefined, to: Preset | undefined): string => {
    if (samePreset(from, to)) return t("diff.none");
    if (!from && to) return `${t("diff.added")} \`${to.name}\``;
    if (from && !to) return `${t("diff.removed")} \`${from.name}\``;
    if (!from || !to) return "";

    const parts: string[] = [];
    if (from.name !== to.name) parts.push(t("psh.focusRenamed", { from: from.name, to: to.name }));
    if (from.group !== to.group) parts.push(t("psh.focusRegrouped", { from: from.group ?? "-", to: to.group ?? "-" }));
    if (from.note !== to.note) parts.push(t("psh.focusNoteChanged"));
    if (from.content !== to.content) {
      parts.push(formatEnvDiff(diffEnvVariables(parseEnv(from.content), parseEnv(to.content)), show));
    }
    return parts.join("\n\n");
  };

  /** 本项目的方案集合在两个版本之间:哪几份新增、删除、改动 */
  const projectDiff = (from: Preset[], to: Preset[]): string => {
    const fromById = new Map(from.map((p) => [p.id, p]));
    const toById = new Map(to.map((p) => [p.id, p]));
    const lines: string[] = [];
    for (const p of to) if (!fromById.has(p.id)) lines.push(`${t("diff.added")} \`${p.name}\``);
    for (const p of from) if (!toById.has(p.id)) lines.push(`${t("diff.removed")} \`${p.name}\``);
    for (const p of to) {
      const before = fromById.get(p.id);
      if (before && !samePreset(before, p)) {
        const renamed = before.name !== p.name ? ` ${t("diff.renamed", { name: before.name })}` : "";
        lines.push(`${t("diff.changed")} \`${p.name}\`${renamed}`);
      }
    }
    return lines.length === 0 ? t("diff.none") : lines.join("\n\n");
  };

  const buildMarkdown = (item: ConfigSnapshotItem): string => {
    const text = allContents.get(item.filename);
    const file = parseOrNull(text);
    if (!file || text === undefined) return t("psh.unreadable");
    const prevText = prevTextOf(item);
    const mine = listPresetsForProject(file, projectId);
    const currentMine = currentFile ? listPresetsForProject(currentFile, projectId) : [];

    const info = [
      `### ${t("psh.infoHeading")}`,
      "",
      `**${t("psh.infoRecordedAt")}**: \`${prettyTimestamp(item.timestampStr)}\``,
      "",
      `**${t("psh.infoCount")}**: \`${mine.length}\``,
    ];

    if (focusPreset) {
      const here = focusIn(text);
      const content = here ? formatEnvContentMasked(here.content, customSecrets) : "";
      return [
        ...info,
        "",
        "---",
        "",
        diffBlock(
          t("diff.fromPrevHeading"),
          t("diff.fromPrevHint"),
          prevText === null ? t("diff.noPrev") : focusDiff(focusIn(prevText), here),
        ),
        "",
        "---",
        "",
        // 决定要不要恢复,看的正是这一段:恢复回去会撤销掉什么
        diffBlock(
          t("diff.toCurrentHeading"),
          t("diff.toCurrentHint"),
          focusDiff(
            here,
            currentMine.find((p) => p.id === focusPreset.id),
          ),
        ),
        "",
        "---",
        "",
        `### ${t("ps.diffContentHeading")}`,
        "",
        here
          ? [
              `**${here.name}**${here.group ? ` · ${here.group}` : ""}${here.note ? `\n\n_${here.note}_` : ""}`,
              "",
              content.trim() ? `\`\`\`dotenv\n${content}\n\`\`\`` : t("ps.contentPreviewEmpty"),
            ].join("\n")
          : t("psh.focusAbsent"),
      ].join("\n");
    }

    const listing =
      mine.length === 0
        ? t("psh.contentEmpty")
        : groupPresets(mine)
            .flatMap((b) => b.presets.map((p) => `\`${b.group ?? t("grp.ungrouped")}\` · ${p.name}`))
            .join("\n\n");

    return [
      ...info,
      "",
      "---",
      "",
      diffBlock(
        t("diff.fromPrevHeading"),
        t("diff.fromPrevHint"),
        prevText === null ? t("diff.noPrev") : projectDiff(projectPresetsIn(prevText), mine),
      ),
      "",
      "---",
      "",
      diffBlock(t("diff.toCurrentHeading"), t("diff.toCurrentHint"), projectDiff(mine, currentMine)),
      "",
      "---",
      "",
      `### ${t("psh.contentHeading")}`,
      "",
      listing,
    ].join("\n");
  };

  return (
    <List
      isLoading={loading}
      isShowingDetail={visibleItems.length > 0}
      onSelectionChange={setSelectedId}
      navigationTitle={
        focusPreset ? t("psh.focusNavTitle", { name: focusPreset.name }) : t("psh.navTitle", { project: projectName })
      }
      searchBarPlaceholder={t("psh.searchPlaceholder")}
    >
      <List.Section title={t("psh.sectionTitle")} subtitle={t("psh.sectionSubtitle", { count: visibleItems.length })}>
        {visibleItems.map((item) => (
          <List.Item
            key={item.filename}
            id={item.filename}
            icon={Icon.Clock}
            title={prettyTimestamp(item.timestampStr)}
            detail={<List.Item.Detail markdown={selectedId === item.filename ? buildMarkdown(item) : ""} />}
            actions={
              <ActionPanel>
                {/* 这一版里还没有这份方案时,没有东西可以恢复,动作直接不给 */}
                {(!focusPreset || focusIn(allContents.get(item.filename))) && (
                  <Action
                    title={focusPreset ? t("psh.focusActionRestore") : t("psh.actionRestore")}
                    icon={Icon.Undo}
                    onAction={() => handleRestore(item)}
                  />
                )}
                <Action.CopyToClipboard title={t("psh.actionCopy")} content={projectSliceText(item)} concealed />
                <Action
                  title={t("psh.actionDelete")}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => handleDelete(item)}
                />
                <Action.Push
                  title={t("psh.actionCleanup")}
                  icon={Icon.DeleteDocument}
                  target={
                    <SnapshotCleanupForm
                      navTitle={t("psh.actionCleanup")}
                      unit={t("psh.cleanupUnit")}
                      description={t("psh.cleanupDescription", { project: projectName })}
                      snapshots={visibleItems}
                      onCleanupBelow={(oldestKept) => cleanProjectPresetHistory(oldestKept, projectId)}
                      onCleaned={refresh}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {visibleItems.length === 0 && !loading && (
        <List.EmptyView
          title={focusPreset ? t("psh.focusEmptyTitle") : t("psh.emptyTitle")}
          description={focusPreset ? t("psh.focusEmptyDesc") : t("psh.emptyDesc")}
        />
      )}
    </List>
  );
}
