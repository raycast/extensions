import {
  Action,
  ActionPanel,
  Alert,
  Grid,
  Icon,
  Keyboard,
  List,
  Toast,
  confirmAlert,
  showToast,
  useNavigation,
} from "@raycast/api";
import { t } from "../i18n.ts";
import { templateFields } from "../bookmark-utils.ts";
import { BookmarkForm, failureMessage } from "../bookmark-form.tsx";
import { bookmarkMutation, deleteBookmark, restoreBookmark } from "../model.ts";
import type { Bookmark, LibraryState, Mutation, Visit } from "../model.ts";
import { ensureIconForBookmark, iconImageSource } from "../icon-service.ts";
import ManageData from "../manage-data.tsx";
import { TemplateForm } from "./template-form.tsx";
import { LocationsForm } from "./locations-form.tsx";
import { hostOf } from "./query.ts";

export function bookmarkIcon(bookmark: Bookmark) {
  return iconImageSource(bookmark.icon) ?? Icon.Bookmark;
}

export function BookmarkActions({
  root,
  state,
  bookmark,
  onSaved,
  onReload,
  openBookmark,
  applyCommit,
  onToggleView,
}: {
  root: string;
  state: LibraryState;
  bookmark?: Bookmark;
  onSaved: (state: LibraryState) => void;
  onReload: () => Promise<void>;
  openBookmark: (
    bookmark: Bookmark,
    values?: Record<string, string>,
  ) => Promise<boolean>;
  applyCommit: (
    mutations: Mutation[],
    visits: Visit[] | undefined,
    title: string,
    message?: string,
  ) => Promise<void>;
  onToggleView?: () => void;
}) {
  const { push } = useNavigation();
  const conflicted = state.status === "conflicted";
  const fields = bookmark ? templateFields(bookmark.url) : [];
  return (
    <ActionPanel>
      {bookmark && (
        <Action
          title={fields.length ? t("填写参数并打开") : t("打开")}
          icon={Icon.Globe}
          onAction={() => {
            if (fields.length)
              push(
                <TemplateForm
                  fields={fields}
                  bookmark={bookmark}
                  onSubmit={(values) => openBookmark(bookmark, values)}
                />,
              );
            else void openBookmark(bookmark);
          }}
        />
      )}
      {bookmark && (
        <Action.CopyToClipboard
          title={t("复制 URL")}
          content={bookmark.url}
          shortcut={Keyboard.Shortcut.Common.Copy}
        />
      )}
      {onToggleView && (
        <Action
          title={t("切换列表 / 网格")}
          icon={Icon.AppWindowGrid3x3}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={onToggleView}
        />
      )}
      {!conflicted && (
        <>
          <Action
            title={t("新增书签")}
            icon={Icon.Plus}
            shortcut={Keyboard.Shortcut.Common.New}
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
          {bookmark && (
            <Action
              title={t("编辑")}
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              onAction={() =>
                push(
                  <BookmarkForm
                    root={root}
                    state={state}
                    bookmark={bookmark}
                    onSaved={(next) => onSaved(next)}
                  />,
                )
              }
            />
          )}
          {bookmark && !bookmark.isDeleted && (
            <Action
              title={t("管理分类位置")}
              icon={Icon.Tag}
              shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
              onAction={() =>
                push(
                  <LocationsForm
                    root={root}
                    state={state}
                    bookmark={bookmark}
                    onSaved={onSaved}
                  />,
                )
              }
            />
          )}
        </>
      )}
      {!conflicted && bookmark && (
        <Action
          title={bookmark.pinned ? t("取消收藏") : t("加入收藏")}
          icon={bookmark.pinned ? Icon.StarDisabled : Icon.Star}
          shortcut={Keyboard.Shortcut.Common.Pin}
          onAction={() =>
            void applyCommit(
              [
                bookmarkMutation(state, {
                  ...bookmark,
                  pinned: !bookmark.pinned,
                  updatedAt: Date.now(),
                }),
              ],
              undefined,
              bookmark.pinned ? t("已取消收藏") : t("已加入收藏"),
              bookmark.title,
            )
          }
        />
      )}
      {!conflicted &&
        bookmark &&
        (bookmark.isDeleted ? (
          <Action
            title={t("恢复")}
            icon={Icon.ArrowCounterClockwise}
            onAction={() =>
              void applyCommit(
                [restoreBookmark(state, bookmark)],
                undefined,
                t("已恢复"),
                bookmark.title,
              )
            }
          />
        ) : (
          <Action
            title={t("移入回收站")}
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={async () => {
              const confirmed = await confirmAlert({
                title: t("移入回收站？"),
                message: t`${bookmark.title} 将移入回收站，之后可恢复。`,
                primaryAction: {
                  title: t("移入回收站"),
                  style: Alert.ActionStyle.Destructive,
                },
              });
              if (confirmed)
                void applyCommit(
                  [deleteBookmark(state, bookmark)],
                  undefined,
                  t("已移入回收站"),
                  bookmark.title,
                );
            }}
          />
        ))}
      {conflicted && (
        <Action.Push
          title={t("解决冲突…")}
          icon={Icon.Warning}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          target={<ManageData onSaved={onSaved} onClose={onReload} />}
        />
      )}
      <Action.Push
        title={t("设置与数据")}
        icon={Icon.Gear}
        target={<ManageData onSaved={onSaved} onClose={onReload} />}
      />
      {!conflicted && bookmark && (
        <Action
          title={t("刷新图标")}
          icon={Icon.Image}
          shortcut={{ modifiers: ["cmd", "opt"], key: "i" }}
          onAction={() =>
            void (async () => {
              try {
                const icon = await ensureIconForBookmark(root, bookmark, true);
                await applyCommit(
                  [
                    bookmarkMutation(state, {
                      ...bookmark,
                      icon,
                      iconMatchedAt: Date.now(),
                      updatedAt: Date.now(),
                    }),
                  ],
                  undefined,
                  t("已刷新图标"),
                  bookmark.title,
                );
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: t("刷新图标失败"),
                  message: failureMessage(error),
                });
              }
            })()
          }
        />
      )}
    </ActionPanel>
  );
}

export function BookmarkListItem({
  root,
  state,
  bookmark,
  onSaved,
  onReload,
  openBookmark,
  applyCommit,
  onToggleView,
}: {
  root: string;
  state: LibraryState;
  bookmark: Bookmark;
  onSaved: (state: LibraryState) => void;
  onReload: () => Promise<void>;
  openBookmark: (
    bookmark: Bookmark,
    values?: Record<string, string>,
  ) => Promise<boolean>;
  applyCommit: (
    mutations: Mutation[],
    visits: Visit[] | undefined,
    title: string,
    message?: string,
  ) => Promise<void>;
  onToggleView: () => void;
}) {
  return (
    <List.Item
      id={bookmark.id}
      title={bookmark.title}
      subtitle={hostOf(bookmark.url)}
      icon={bookmarkIcon(bookmark)}
      keywords={[bookmark.url, bookmark.desc ?? "", ...bookmark.tags]}
      accessories={
        bookmark.pinned ? [{ icon: Icon.Star, tooltip: t("收藏") }] : undefined
      }
      actions={
        <BookmarkActions
          root={root}
          state={state}
          bookmark={bookmark}
          onSaved={onSaved}
          onReload={onReload}
          openBookmark={openBookmark}
          applyCommit={applyCommit}
          onToggleView={onToggleView}
        />
      }
    />
  );
}

export function BookmarkGridItem({
  root,
  state,
  bookmark,
  onSaved,
  onReload,
  openBookmark,
  applyCommit,
  onToggleView,
}: {
  root: string;
  state: LibraryState;
  bookmark: Bookmark;
  onSaved: (state: LibraryState) => void;
  onReload: () => Promise<void>;
  openBookmark: (
    bookmark: Bookmark,
    values?: Record<string, string>,
  ) => Promise<boolean>;
  applyCommit: (
    mutations: Mutation[],
    visits: Visit[] | undefined,
    title: string,
    message?: string,
  ) => Promise<void>;
  onToggleView: () => void;
}) {
  return (
    <Grid.Item
      id={bookmark.id}
      title={bookmark.title}
      subtitle={hostOf(bookmark.url)}
      content={bookmarkIcon(bookmark)}
      keywords={[bookmark.url, bookmark.desc ?? "", ...bookmark.tags]}
      accessory={
        bookmark.pinned ? { icon: Icon.Star, tooltip: t("收藏") } : undefined
      }
      actions={
        <BookmarkActions
          root={root}
          state={state}
          bookmark={bookmark}
          onSaved={onSaved}
          onReload={onReload}
          openBookmark={openBookmark}
          applyCommit={applyCommit}
          onToggleView={onToggleView}
        />
      }
    />
  );
}
