import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { BookmarkList } from "./components/BookmarkList";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useTranslation } from "./hooks/useTranslation";
import CreateNoteView from "./createNote";

export default function Notes() {
  const { t } = useTranslation();
  const { isLoading, bookmarks: allBookmarks, revalidate, pagination } = useGetAllBookmarks({ type: "text" });

  // Client-side guard: useCachedPromise may serve a stale all-bookmarks cache
  // while the type=text fetch is in flight. Always filter to notes only.
  const bookmarks = allBookmarks.filter((b) => b.content.type === "text");

  if (isLoading && bookmarks.length === 0) {
    return (
      <List>
        <List.EmptyView title={t("loading")} icon={Icon.Document} description={t("pleaseWait")} />
      </List>
    );
  }

  if (!isLoading && bookmarks.length === 0) {
    return (
      <List>
        <List.EmptyView
          title={t("notes.empty.title")}
          description={t("notes.empty.description")}
          icon={Icon.Document}
          actions={
            <ActionPanel>
              <Action.Push
                title={t("note.create")}
                icon={Icon.Plus}
                target={<CreateNoteView />}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <BookmarkList
      bookmarks={bookmarks}
      isLoading={isLoading}
      onRefresh={revalidate}
      pagination={pagination}
      searchBarPlaceholder={t("notes.searchPlaceholder")}
      emptyViewTitle={t("notes.empty.title")}
      emptyViewDescription={t("notes.empty.description")}
      itemLabel={t("notes.title")}
    />
  );
}
