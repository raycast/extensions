import {
  Action,
  ActionPanel,
  Grid,
  Icon,
  List,
  useNavigation,
} from "@raycast/api";
import { t } from "../i18n.ts";
import { BookmarkForm } from "../bookmark-form.tsx";
import SharedJsonForm from "../shared-json.tsx";
import ManageData from "../manage-data.tsx";
import type { LibraryState } from "../model.ts";
import { hostOf, looksLikeHttpUrl } from "./query.ts";

export function SearchEmptyView({
  root,
  state,
  query,
  scope,
  onSaved,
  view = "list",
}: {
  root: string;
  state: LibraryState;
  query: string;
  scope: string;
  onSaved: (state: LibraryState) => void;
  view?: "list" | "grid";
}) {
  const { push } = useNavigation();
  const conflicted = state.status === "conflicted";
  const Empty = view === "grid" ? Grid.EmptyView : List.EmptyView;
  return (
    <Empty
      icon={Icon.Bookmark}
      title={
        query
          ? t("没有匹配的书签")
          : scope === "trash"
            ? t("回收站为空")
            : t("还没有书签")
      }
      description={
        query
          ? t("本地未匹配到结果，也不会注册任何全局搜索入口")
          : t("打开数据文件夹或新增书签")
      }
      actions={
        <ActionPanel>
          <Action.Push
            title={t("共享数据文件夹")}
            icon={Icon.Folder}
            target={
              <SharedJsonForm root={root} state={state} onSaved={onSaved} />
            }
          />
          {!conflicted && looksLikeHttpUrl(query) && (
            <Action
              title={t("保存此链接")}
              icon={Icon.Plus}
              onAction={() => {
                const url = query.trim();
                push(
                  <BookmarkForm
                    root={root}
                    state={state}
                    seed={{ url, title: hostOf(url) }}
                    onSaved={(next) => onSaved(next)}
                  />,
                );
              }}
            />
          )}
          {!conflicted && (
            <Action
              title={t("新增书签")}
              icon={Icon.Plus}
              onAction={() =>
                push(
                  <BookmarkForm
                    root={root}
                    state={state}
                    onSaved={(next) => onSaved(next)}
                  />,
                )
              }
            />
          )}
          <Action.Push
            title={t("设置与数据")}
            icon={Icon.Gear}
            target={<ManageData onSaved={onSaved} />}
          />
        </ActionPanel>
      }
    />
  );
}
