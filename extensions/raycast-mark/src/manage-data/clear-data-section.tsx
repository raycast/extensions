import {
  Action,
  ActionPanel,
  Alert,
  Icon,
  List,
  Toast,
  confirmAlert,
  showToast,
} from "@raycast/api";
import { t } from "../i18n.ts";
import {
  bookmarkMutation,
  canonical,
  catalogMutation,
  emptyCatalog,
} from "../model.ts";
import type { LibraryState, Mutation } from "../model.ts";
import { commit } from "../repository.ts";
import { sharedJsonPath } from "../shared-json-storage.ts";
import { failureMessage } from "../bookmark-form.tsx";

export function ClearDataSection({
  root,
  state,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  onSaved: (state: LibraryState) => void;
}) {
  async function clear(all: boolean) {
    const bookmarks = state.bookmarks.filter(
      (bookmark) => all || bookmark.isDeleted,
    );
    const mutations: Mutation[] = bookmarks.map((bookmark) => ({
      ...bookmarkMutation(state, bookmark),
      value: bookmark,
      coveredVisits: state.visitEventIds?.[bookmark.id] ?? [],
      removed: true,
    }));
    if (all && canonical(state.catalog) !== canonical(emptyCatalog()))
      mutations.push(catalogMutation(state, emptyCatalog()));
    if (!mutations.length) {
      await showToast({ title: t("无变化"), style: Toast.Style.Success });
      return;
    }
    const source = await sharedJsonPath();
    const accepted = await confirmAlert({
      title: all ? t("清空全部书签？") : t("清空回收站？"),
      message: `${t("永久移除书签")} ${bookmarks.length}\n${t("事件历史保留，书签不会因历史回放恢复；请先备份。")}${source ? `\n${t("此操作也会更新连接的数据文件夹：")}${source}` : ""}`,
      primaryAction: {
        title: t("永久移除"),
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!accepted) return;
    try {
      const result = await commit(root, {
        mutations,
        expectedHeads: state.heads,
        replaceUsage: true,
      });
      onSaved(result.state);
      await showToast({
        title: result.sharedSyncPaused
          ? t("本地已保存，同步暂停")
          : t("已清空"),
        message: result.warning,
        style: result.sharedSyncPaused
          ? Toast.Style.Failure
          : Toast.Style.Success,
      });
    } catch (error) {
      await showToast({
        title: t("未写入"),
        message: failureMessage(error),
        style: Toast.Style.Failure,
      });
    }
  }
  return (
    <List.Section title={t("清理书签")}>
      {[false, true].map((all) => (
        <List.Item
          key={String(all)}
          title={all ? t("清空全部书签") : t("清空回收站")}
          icon={Icon.Trash}
          actions={
            <ActionPanel>
              <Action
                title={all ? t("清空全部书签") : t("清空回收站")}
                style={Action.Style.Destructive}
                onAction={() => clear(all)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List.Section>
  );
}
