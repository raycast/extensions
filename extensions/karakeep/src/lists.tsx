import { Action, ActionPanel, confirmAlert, Icon, List, showToast, Toast, useNavigation } from "@raycast/api";
import { useCallback, useMemo } from "react";
import { logger } from "@chrismessina/raycast-logger";
import { fetchDeleteList } from "./apis";
import { BookmarkList } from "./components/BookmarkList";
import { useConfig } from "./hooks/useConfig";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useGetAllLists } from "./hooks/useGetAllLists";
import { useGetListsBookmarks } from "./hooks/useGetListsBookmarks";
import { useTranslation } from "./hooks/useTranslation";
import { runWithToast } from "./utils/toast";

interface ListWithCount {
  id: string;
  name: string;
  icon: string;
  parentId: string | null;
  count: number;
  children?: ListWithCount[];
}

function buildHierarchy(lists: ListWithCount[]): ListWithCount[] {
  const listMap = new Map(lists.map((list) => [list.id, { ...list, children: [] as ListWithCount[] }]));
  const rootLists: ListWithCount[] = [];

  lists.forEach((list) => {
    if (list.parentId === null) {
      rootLists.push(listMap.get(list.id)!);
    } else {
      const parent = listMap.get(list.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(listMap.get(list.id)!);
      }
    }
  });

  return rootLists;
}

function ListBookmarksView({ listId, listName }: { listId: string; listName: string }) {
  const { bookmarks, isLoading, revalidate, pagination } = useGetListsBookmarks(listId);
  const { t } = useTranslation();

  const handleRefresh = async () => {
    await runWithToast({
      loading: { title: t("refreshingLists"), message: t("pleaseWait") },
      success: { title: t("listsRefreshed") },
      failure: { title: t("refreshError") },
      action: async () => {
        try {
          await revalidate();
        } catch (error) {
          logger.error("Failed to refresh list bookmarks", { listId, listName, error });
          throw error;
        }
      },
    });
  };

  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      onRefresh={handleRefresh}
      pagination={pagination}
      searchBarPlaceholder={t("list.searchInList", { name: listName })}
      emptyViewTitle={t("list.noBookmarks.title")}
      emptyViewDescription={t("list.noBookmarks.description")}
    />
  );
}

function ArchivedBookmarks() {
  const { bookmarks, isLoading, revalidate, pagination } = useGetAllBookmarks({
    archived: true,
  });
  const { t } = useTranslation();

  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      onRefresh={revalidate}
      pagination={pagination}
      searchBarPlaceholder={t("list.searchInArchived")}
      emptyViewTitle={t("list.noArchived.title")}
      emptyViewDescription={t("list.noArchived.description")}
    />
  );
}

function FavoritedBookmarks() {
  const { bookmarks, isLoading, revalidate, pagination } = useGetAllBookmarks({
    favourited: true,
  });
  const { t } = useTranslation();
  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      onRefresh={revalidate}
      pagination={pagination}
      searchBarPlaceholder={t("list.searchInFavorites")}
      emptyViewTitle={t("list.noFavorites.title")}
      emptyViewDescription={t("list.noFavorites.description")}
    />
  );
}

const getDashboardListsPage = (apiUrl: string, listId: string) => `${apiUrl}/dashboard/lists/${listId}`;

export default function Lists() {
  const { isLoading, lists, revalidate } = useGetAllLists();
  const { push } = useNavigation();
  const { config } = useConfig();
  const { t } = useTranslation();
  const { apiUrl } = config;

  const handleDeleteList = useCallback(
    async (id: string) => {
      const list = lists?.find((list) => list.id === id);
      const listName = list?.name;

      if (
        await confirmAlert({
          title: t("list.deleteList"),
          message: t("list.deleteConfirm", { name: listName || "" }),
        })
      ) {
        await runWithToast({
          loading: { title: t("common.deleting") },
          success: { title: t("common.deleteSuccess") },
          failure: { title: t("common.deleteFailed") },
          action: async () => {
            try {
              await fetchDeleteList(id);
              await revalidate();
            } catch (error) {
              logger.error("Failed to delete list", { listId: id, listName, error });
              throw error;
            }
          },
        });
      } else {
        await showToast({
          title: t("common.deleteCancel"),
          style: Toast.Style.Failure,
        });
      }
    },
    [lists, revalidate, t],
  );

  const handleShowFavoritedBookmarks = useCallback(() => {
    push(<FavoritedBookmarks />);
  }, [push]);

  const handleShowArchivedBookmarks = useCallback(() => {
    push(<ArchivedBookmarks />);
  }, [push]);

  const ListItemComponent = useCallback(
    ({ list, level }: { list: ListWithCount; level: number }) => {
      return (
        <List.Item
          key={list.id}
          icon={list.icon}
          title={`${"  ".repeat(level)}${list.name} (${list.count})`}
          actions={
            <ActionPanel>
              <Action
                title={t("list.openList")}
                onAction={() => push(<ListBookmarksView listId={list.id} listName={list.name} />)}
                icon={Icon.List}
              />
              <Action.OpenInBrowser url={getDashboardListsPage(apiUrl, list.id)} title={t("common.viewInBrowser")} />
              <Action.CopyToClipboard
                title={t("common.copyId")}
                content={list.id}
                shortcut={{ modifiers: ["cmd"], key: "." }}
              />
              <ActionPanel.Section>
                <Action title={t("list.deleteList")} icon={Icon.Trash} onAction={() => handleDeleteList(list.id)} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      );
    },
    [t, push, handleDeleteList, apiUrl],
  );

  const hierarchicalLists = useMemo(() => (lists ? buildHierarchy(lists as ListWithCount[]) : []), [lists]);

  const renderListItems = useCallback(
    (items: ListWithCount[], level = 0) => {
      return items.flatMap((list) => {
        const result = [<ListItemComponent key={list.id} list={list} level={level} />];
        if (list.children?.length) {
          result.push(...renderListItems(list.children, level + 1));
        }
        return result;
      });
    },
    [ListItemComponent],
  );

  return (
    <List isLoading={isLoading}>
      <List.Item
        icon="⭐️"
        title={t("list.favorites")}
        actions={
          <ActionPanel>
            <Action title={t("list.openFavorites")} onAction={handleShowFavoritedBookmarks} icon={Icon.List} />
            <Action.OpenInBrowser url={`${apiUrl}/dashboard/favourites`} title={t("common.viewInBrowser")} />
          </ActionPanel>
        }
      />
      <List.Item
        icon="📦"
        title={t("list.archived")}
        actions={
          <ActionPanel>
            <Action title={t("list.openArchived")} onAction={handleShowArchivedBookmarks} icon={Icon.List} />
            <Action.OpenInBrowser url={`${apiUrl}/dashboard/archive`} title={t("common.viewInBrowser")} />
          </ActionPanel>
        }
      />
      {renderListItems(hierarchicalLists)}
    </List>
  );
}
