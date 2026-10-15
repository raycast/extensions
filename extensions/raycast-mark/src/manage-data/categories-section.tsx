import { Fragment } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  List,
  useNavigation,
} from "@raycast/api";
import { categoryTitle, t } from "../i18n.ts";
import { DEFAULT_LOCATION, TRASH_LOCATION } from "../model.ts";
import type { LibraryState } from "../model.ts";
import { CategoryForm } from "./category-form.tsx";

function memberCount(
  state: LibraryState,
  groupId: string,
  subGroupId?: string,
) {
  return state.bookmarks.filter((bookmark) =>
    bookmark.locations.some(
      (location) =>
        location.groupId === groupId &&
        (!subGroupId || location.subGroupId === subGroupId),
    ),
  ).length;
}

export function CategoriesSection({
  root,
  state,
  onSaved,
  onDelete,
}: {
  root: string;
  state: LibraryState;
  onSaved: (state: LibraryState) => void;
  onDelete: (
    groupId: string,
    subGroupId: string | undefined,
    target: "default" | "trash",
  ) => Promise<void>;
}) {
  const { push } = useNavigation();
  return (
    <List.Section title={t("分类")}>
      <List.Item
        title={t("新建一级分类")}
        icon={Icon.Plus}
        actions={
          <ActionPanel>
            <Action
              title={t("新建一级分类")}
              icon={Icon.Plus}
              onAction={() =>
                push(
                  <CategoryForm
                    root={root}
                    state={state}
                    mode="create-group"
                    onSaved={onSaved}
                  />,
                )
              }
            />
          </ActionPanel>
        }
      />
      {state.catalog.groups.map((group) => {
        const fixed =
          group.id === DEFAULT_LOCATION.groupId ||
          group.id === TRASH_LOCATION.groupId;
        return (
          <Fragment key={group.id}>
            <List.Item
              title={categoryTitle(group.id, group.name)}
              subtitle={t`一级分类 · 书签 ${memberCount(state, group.id)}`}
              icon={Icon.Folder}
              actions={
                <ActionPanel>
                  <Action
                    title={t("新建子分类")}
                    icon={Icon.Plus}
                    onAction={() =>
                      push(
                        <CategoryForm
                          root={root}
                          state={state}
                          mode="create-sub"
                          groupId={group.id}
                          onSaved={onSaved}
                        />,
                      )
                    }
                  />
                  <Action
                    title={t("重命名")}
                    icon={Icon.Pencil}
                    shortcut={Keyboard.Shortcut.Common.Edit}
                    onAction={() =>
                      push(
                        <CategoryForm
                          root={root}
                          state={state}
                          mode="rename-group"
                          groupId={group.id}
                          onSaved={onSaved}
                        />,
                      )
                    }
                  />
                  {!fixed && (
                    <>
                      <Action
                        title={t("删除（书签移至默认位置）")}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        onAction={() =>
                          void onDelete(group.id, undefined, "default")
                        }
                      />
                      <Action
                        title={t("删除（书签移入回收站）")}
                        icon={Icon.Trash}
                        style={Action.Style.Destructive}
                        shortcut={Keyboard.Shortcut.Common.Remove}
                        onAction={() =>
                          void onDelete(group.id, undefined, "trash")
                        }
                      />
                    </>
                  )}
                </ActionPanel>
              }
            />
            {group.children.map((sub) => (
              <List.Item
                key={sub.id}
                title={`↳ ${categoryTitle(sub.id, sub.name)}`}
                subtitle={t`子分类 · 书签 ${memberCount(state, group.id, sub.id)}`}
                accessories={[{ tag: categoryTitle(group.id, group.name) }]}
                actions={
                  <ActionPanel>
                    <Action
                      title={t("重命名")}
                      icon={Icon.Pencil}
                      shortcut={Keyboard.Shortcut.Common.Edit}
                      onAction={() =>
                        push(
                          <CategoryForm
                            root={root}
                            state={state}
                            mode="rename-sub"
                            groupId={group.id}
                            subGroupId={sub.id}
                            onSaved={onSaved}
                          />,
                        )
                      }
                    />
                    {!fixed && (
                      <>
                        <Action
                          title={t("删除（书签移至默认位置）")}
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          onAction={() =>
                            void onDelete(group.id, sub.id, "default")
                          }
                        />
                        <Action
                          title={t("删除（书签移入回收站）")}
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={Keyboard.Shortcut.Common.Remove}
                          onAction={() =>
                            void onDelete(group.id, sub.id, "trash")
                          }
                        />
                      </>
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </Fragment>
        );
      })}
    </List.Section>
  );
}
