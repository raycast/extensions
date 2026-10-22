import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  Keyboard,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { getFavicon, showFailureToast, usePromise } from "@raycast/utils";
import { getVaultPath, isValidVault } from "./vault";
import {
  Bookmark,
  BookmarkTag,
  deleteBookmark,
  loadBookmarks,
  setBookmarkArchived,
  setBookmarkTag,
  updateBookmark,
} from "./bookmarks";
import { useState } from "react";

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function EditBookmarkForm({
  vaultPath,
  bookmark,
  onSaved,
}: {
  vaultPath: string;
  bookmark: Bookmark;
  onSaved: () => void;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save"
            onSubmit={async (values: { title: string; searchTerms: string }) => {
              await updateBookmark(vaultPath, bookmark.id, values);
              onSaved();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Name" placeholder="Bookmark name" defaultValue={bookmark.title} />
      <Form.TextField
        id="searchTerms"
        title="Search Terms"
        placeholder="Optional — extra words to find this by"
        info="Extra words to find this by — not shown elsewhere."
        defaultValue={bookmark.searchTerms}
      />
    </Form>
  );
}

export default function Command() {
  const vaultPath = getVaultPath();
  const valid = isValidVault(vaultPath);
  const [selectedTagId, setSelectedTagId] = useState("all");

  const { data, isLoading, revalidate } = usePromise(loadBookmarks, [vaultPath], { execute: valid });

  if (!valid) {
    return (
      <List>
        <List.EmptyView
          title="This doesn't look like a MarkdownOS vault"
          description={`No .markdownos folder found in ${vaultPath}.`}
          actions={
            <ActionPanel>
              <Action title="Change Vault Folder" icon={Icon.Cog} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const bookmarks = (data?.bookmarks ?? [])
    .filter((b) => b.archivedAt === null)
    .filter((b) => selectedTagId === "all" || b.tagIds.includes(selectedTagId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const tags = data?.tags ?? [];

  const runMutation = async (fn: () => Promise<void>, successMessage: string) => {
    try {
      await fn();
      await revalidate();
      await showToast({ style: Toast.Style.Success, title: successMessage });
    } catch (error) {
      await showFailureToast(error);
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search bookmarks..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Tag" value={selectedTagId} onChange={setSelectedTagId}>
          <List.Dropdown.Item title="All" value="all" />
          {tags.map((tag: BookmarkTag) => (
            <List.Dropdown.Item key={tag.id} title={tag.name} value={tag.id} icon={Icon.Tag} />
          ))}
        </List.Dropdown>
      }
    >
      {bookmarks.map((bookmark) => {
        return (
          <List.Item
            key={bookmark.id}
            icon={getFavicon(bookmark.url, { fallback: Icon.Globe })}
            title={bookmark.title}
            subtitle={hostname(bookmark.url)}
            keywords={[bookmark.searchTerms, bookmark.fetchedTitle, bookmark.description, bookmark.url]}
            accessories={[{ date: new Date(bookmark.updatedAt) }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={bookmark.url} icon={Icon.Globe} />
                <Action.CopyToClipboard title="Copy URL" icon={Icon.Link} content={bookmark.url} />
                <Action.Push
                  title="Edit Title"
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  target={<EditBookmarkForm vaultPath={vaultPath} bookmark={bookmark} onSaved={revalidate} />}
                />
                {tags.length > 0 && (
                  <ActionPanel.Submenu title="Tags…" icon={Icon.Tag} shortcut={{ modifiers: ["cmd"], key: "t" }}>
                    {tags.map((tag: BookmarkTag) => {
                      const checked = bookmark.tagIds.includes(tag.id);
                      return (
                        <Action
                          key={tag.id}
                          title={tag.name}
                          icon={checked ? Icon.Check : Icon.Circle}
                          onAction={() =>
                            runMutation(
                              () => setBookmarkTag(vaultPath, bookmark.id, tag.id, !checked),
                              checked ? `Removed "${tag.name}"` : `Added "${tag.name}"`,
                            )
                          }
                        />
                      );
                    })}
                  </ActionPanel.Submenu>
                )}
                <Action
                  title="Archive Bookmark"
                  icon={Icon.Tray}
                  shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  onAction={() => runMutation(() => setBookmarkArchived(vaultPath, bookmark.id, true), "Archived")}
                />
                <Action
                  title="Delete Permanently"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "backspace" }}
                  onAction={async () => {
                    // Unlike a note's own delete, this has no Trash to recover from — the
                    // style/wording alone don't stop an accidental keystroke, so a real
                    // confirmation is what actually does.
                    const confirmed = await confirmAlert({
                      title: "Delete Bookmark Permanently",
                      message: `"${bookmark.title}" will be deleted. This can't be undone.`,
                      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
                    });
                    if (confirmed) await runMutation(() => deleteBookmark(vaultPath, bookmark.id), "Deleted");
                  }}
                />
                <Action title="Change Vault Folder" icon={Icon.Cog} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
