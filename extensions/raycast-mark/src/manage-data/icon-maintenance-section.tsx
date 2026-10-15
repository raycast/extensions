import {
  Action,
  ActionPanel,
  Icon,
  List,
  Toast,
  showToast,
} from "@raycast/api";
import { t } from "../i18n.ts";
import { failureMessage } from "../bookmark-form.tsx";
import { backfillMissingIcons } from "../icon-service.ts";
import { bookmarkMutation } from "../model.ts";
import type { LibraryState } from "../model.ts";
import { commit } from "../repository.ts";

export function IconMaintenanceSection({
  root,
  state,
  onSaved,
}: {
  root: string;
  state: LibraryState;
  onSaved: (state: LibraryState) => void;
}) {
  return (
    <List.Section title={t("图标")}>
      <List.Item
        title={t("补全缺失图标")}
        subtitle={t("为无图标或文字占位的书签抓取 favicon 并写入 icons/")}
        icon={Icon.Image}
        accessories={[
          {
            text: t`${state.bookmarks.filter((b) => !b.isDeleted && (!b.icon || b.icon.type === "text")).length} 待处理`,
          },
        ]}
        actions={
          <ActionPanel>
            <Action
              title={t("补全缺失图标")}
              icon={Icon.Image}
              onAction={() =>
                void (async () => {
                  const toast = await showToast({
                    style: Toast.Style.Animated,
                    title: t("正在补全图标"),
                  });
                  try {
                    const map = await backfillMissingIcons(
                      root,
                      state.bookmarks,
                    );
                    if (!map.size) {
                      toast.style = Toast.Style.Success;
                      toast.title = t("没有需要补全的图标");
                      return;
                    }
                    const mutations = state.bookmarks
                      .filter((b) => map.has(b.id))
                      .map((b) =>
                        bookmarkMutation(state, {
                          ...b,
                          icon: map.get(b.id),
                          iconMatchedAt: Date.now(),
                          updatedAt: Date.now(),
                        }),
                      );
                    // Commit in chunks if many — single transaction for simplicity
                    const result = await commit(root, {
                      mutations,
                      expectedHeads: state.heads,
                    });
                    onSaved(result.state);
                    toast.style = Toast.Style.Success;
                    toast.title = t`已补全 ${map.size} 个图标`;
                    toast.message = result.warning;
                  } catch (error) {
                    toast.style = Toast.Style.Failure;
                    toast.title = t("补全失败");
                    toast.message = failureMessage(error);
                  }
                })()
              }
            />
          </ActionPanel>
        }
      />
    </List.Section>
  );
}
