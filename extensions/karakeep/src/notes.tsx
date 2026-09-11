import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { BookmarkList } from "./components/BookmarkList";
import { useGetAllBookmarks } from "./hooks/useGetAllBookmarks";
import { useTranslation } from "./hooks/useTranslation";
import { connectionGuard } from "./components/ConnectionErrorView";
import CreateNoteView from "./createNote";

export default function Notes() {
  const { t } = useTranslation();
  const {
    isLoading,
    bookmarks: allBookmarks,
    error,
    hasLiveData,
    revalidate,
    pagination,
  } = useGetAllBookmarks({ type: "text" });

  // Client-side guard: useCachedPromise may serve a stale all-bookmarks cache
  // while the type=text fetch is in flight. Always filter to notes only.
  const bookmarks = allBookmarks.filter((b) => b.content.type === "text");

  // Must precede the empty-state branch below: an unreachable server yields
  // zero notes, and "No notes yet" would be a lie that hides the real problem.
  const guard = connectionGuard(error, hasLiveData, revalidate);
  if (guard) return guard;

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
                shortcut={Keyboard.Shortcut.Common.New}
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
      error={error}
      hasLiveData={hasLiveData}
      onRefresh={revalidate}
      pagination={pagination}
      searchBarPlaceholder={t("notes.searchPlaceholder")}
      emptyViewTitle={t("notes.empty.title")}
      emptyViewDescription={t("notes.empty.description")}
      itemLabel={t("notes.title")}
    />
  );
}
