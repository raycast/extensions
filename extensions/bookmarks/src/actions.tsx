import { ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { deleteBookmark, Bookmark } from "./api";
import BookmarkDetail from "./detail";
import BookmarkForm from "./create-bookmark";

export default function BookmarkActions(props: {
  bookmark: Bookmark;
  showDetail?: boolean;
  onUpdateBookmark: () => void;
  onDeleteBookmark: () => void;
}) {
  async function handleDeleteBookmark() {
    await showToast({ style: Toast.Style.Animated, title: "Deleting bookmark" });

    try {
      await deleteBookmark(props.bookmark);
      await showToast({ style: Toast.Style.Success, title: "Deleted bookmark" });

      props.onDeleteBookmark();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed deleting user",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section key="detail">
        {props.showDetail && (
          <Action.Push
            key="read-bookmark"
            icon={Icon.Sidebar}
            title="Read Bookmark"
            target={<BookmarkDetail bookmark={props.bookmark} />}
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section key="copy">
        <Action.CopyToClipboard key="copy-link" title="Copy Link" content={props.bookmark?.link || ""} />
        <Action.CopyToClipboard key="copy-title" title="Copy Title" content={props.bookmark?.title || ""} />
      </ActionPanel.Section>
      <ActionPanel.Section key="actions">
        <Action.Push
          key="update-bookmark"
          icon={Icon.Pencil}
          title="Update Bookmark"
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          target={<BookmarkForm title="Update Bookmark" bookmark={props.bookmark} onPop={props.onUpdateBookmark} />}
        />
        <Action
          key="delete-bookmark"
          icon={Icon.Trash}
          title="Delete Bookmark"
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={handleDeleteBookmark}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}
