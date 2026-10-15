import { t } from "./i18n.ts";
import { useCallback, useEffect, useState } from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Detail,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  environment,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { failureMessage } from "./bookmark-form.tsx";
import { removeCategory } from "./model.ts";
import type { LibraryState, Mutation } from "./model.ts";
import { commit, resolveConflicts } from "./repository.ts";
import { loadConfiguredLibrary } from "./library-source.ts";
import { DataDirectorySection } from "./manage-data/data-directory-section.tsx";
import { CategoriesSection } from "./manage-data/categories-section.tsx";
import { ConflictsSection } from "./manage-data/conflicts-section.tsx";
import type { ConflictChoice } from "./manage-data/conflict-view.tsx";
import { IconMaintenanceSection } from "./manage-data/icon-maintenance-section.tsx";
import { disconnectSharedSource } from "./shared-json-storage.ts";
import SharedJsonForm from "./shared-json.tsx";
import { ExportForm } from "./manage-data/export-form.tsx";
import { ClearDataSection } from "./manage-data/clear-data-section.tsx";
import { ImportExportSection } from "./manage-data/import-export-section.tsx";

export default function Command({
  onClose,
  onSaved,
}: {
  onClose?: () => void;
  onSaved?: (state: LibraryState) => void;
} = {}) {
  const preferences = getPreferenceValues<Preferences>();
  const [root, setRoot] = useState<string>();
  const [state, setState] = useState<LibraryState>();
  const [failure, setFailure] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [resolutions, setResolutions] = useState<
    Record<string, ConflictChoice>
  >({});

  useEffect(() => () => onClose?.(), [onClose]);

  const saveState = useCallback(
    (library: LibraryState) => {
      setState(library);
      onSaved?.(library);
    },
    [onSaved],
  );

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const {
        root: directory,
        state: library,
        sourceError,
      } = await loadConfiguredLibrary(preferences, environment.supportPath);
      setRoot(directory);
      saveState(library);
      setResolutions({});
      setFailure(sourceError);
    } catch (error) {
      setFailure(failureMessage(error));
    }
    setIsLoading(false);
  }, [preferences.dataDirectory, preferences.dataFile, saveState]);

  useEffect(() => {
    void load();
  }, [load]);

  async function deleteCategory(
    groupId: string,
    subGroupId: string | undefined,
    target: "default" | "trash",
  ) {
    if (!root || !state) return;
    let mutations: Mutation[];
    let affectedCount: number;
    try {
      ({ mutations, affectedCount } = removeCategory(
        state,
        groupId,
        subGroupId,
        target,
      ));
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("无法删除分类"),
        message: failureMessage(error),
      });
      return;
    }
    const confirmed = await confirmAlert({
      title: t`删除${subGroupId ? t("子分类") : t("一级分类")}？`,
      message: t`受影响的 ${affectedCount} 个书签将${target === "trash" ? t("移入回收站") : t("移至默认位置")}；分类与书签在同一事务写入。`,
      primaryAction: { title: t("删除"), style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      const result = await commit(root, {
        mutations,
        expectedHeads: state.heads,
      });
      saveState(result.state);
      await showToast({
        style: result.sharedSyncPaused
          ? Toast.Style.Failure
          : Toast.Style.Success,
        title: result.sharedSyncPaused
          ? t("本地已保存，同步暂停")
          : t("已删除分类"),
        message: result.warning ?? t`受影响书签 ${affectedCount} 个`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("未写入"),
        message: failureMessage(error),
      });
    }
  }

  async function applyResolutions() {
    if (!root || !state) return;
    const chosen = Object.values(resolutions);
    if (chosen.length !== state.conflicts.length) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("还有冲突未选择版本"),
        message: t`已选择 ${chosen.length}/${state.conflicts.length}`,
      });
      return;
    }
    try {
      const result = await resolveConflicts(
        root,
        chosen.map((entry) => entry.mutation),
        state.heads,
      );
      saveState(result.state);
      setResolutions({});
      await showToast({
        style: result.sharedSyncPaused
          ? Toast.Style.Failure
          : Toast.Style.Success,
        title: result.sharedSyncPaused
          ? t("本地已保存，同步暂停")
          : t("冲突已解决"),
        message: result.warning ?? t`已提交 ${chosen.length} 个版本`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: t("未写入"),
        message: failureMessage(error),
      });
    }
  }

  const recoveryActions = (
    <ActionPanel>
      <Action
        title={t("重新加载")}
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={load}
      />
      {root && (
        <>
          <Action.Push
            title={t("导出数据文件夹")}
            target={<ExportForm root={root} />}
          />
          <Action.Push
            title={t("备份本地事件库（恢复用）")}
            target={<ExportForm root={root} recovery />}
          />
        </>
      )}
      {root && state && (
        <>
          <Action.Push
            title={t("共享数据文件夹")}
            target={
              <SharedJsonForm
                root={root}
                state={state}
                onSaved={(next) => {
                  saveState(next);
                  void load();
                }}
              />
            }
          />
          <Action
            title={t("断开并保留本地")}
            onAction={async () => {
              await disconnectSharedSource();
              await load();
            }}
          />
        </>
      )}
      <Action
        title={t("打开扩展设置")}
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
      />
    </ActionPanel>
  );

  if (failure) {
    return (
      <Detail
        markdown={t`# 无法读取本地库\n\n${failure}\n\n请在扩展设置中确认“Shared Data Folder”指向包含 bookmarks.json 与 assets/icons 的文件夹。`}
        actions={recoveryActions}
      />
    );
  }

  if (!root || !state) {
    return (
      <List isLoading>
        <List.EmptyView title={t("正在读取本地库")} />
      </List>
    );
  }

  if (state.status === "blocked") {
    const issues = state.issues
      .map(
        (issue) =>
          `- \`${issue.code}\` ${issue.message}${issue.file ? `（${issue.file}）` : ""}`,
      )
      .join("\n");
    return (
      <Detail
        markdown={t`# 本地库已暂停写入\n\n存在损坏、缺父、未知版本或超限的数据；不会以空库覆盖，也不会自动清理未知文件。\n\n${issues}\n\n数据目录：\`${root}\``}
        actions={recoveryActions}
      />
    );
  }

  const ready = state.status === "ready";
  const conflicted = state.conflicts.length > 0;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={t("管理分类与数据")}
      searchBarPlaceholder={t("搜索分类或功能")}
    >
      <DataDirectorySection
        root={root}
        state={state}
        onSaved={saveState}
        onReload={load}
      />
      {conflicted && (
        <ConflictsSection
          state={state}
          resolutions={resolutions}
          onChoose={(entityKey, choice) =>
            setResolutions((previous) => ({ ...previous, [entityKey]: choice }))
          }
          onApply={applyResolutions}
        />
      )}
      <ImportExportSection root={root} state={state} onSaved={saveState} />
      {ready && (
        <>
          <CategoriesSection
            root={root}
            state={state}
            onSaved={saveState}
            onDelete={deleteCategory}
          />
          <IconMaintenanceSection
            root={root}
            state={state}
            onSaved={saveState}
          />
          <ClearDataSection root={root} state={state} onSaved={saveState} />
        </>
      )}
    </List>
  );
}
