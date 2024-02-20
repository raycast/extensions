import React from "react";
import { User } from "@supabase/supabase-js";
import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  Image,
  List,
  Toast,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { useAuth } from "../lib/use-auth";
import { useGroups } from "../lib/use-groups";
import { useBookmarks } from "../lib/use-bookmarks";
import { getHostname } from "../lib/getHostname";
import { deleteBookmark } from "../lib/db";

export function SearchBookmarks({ user }: { user: User }) {
  const { data: groups, isLoading: isLoadingGroups } = useGroups(user);
  const [groupId, setGroupId] = React.useState<string | undefined>("");
  const { data: bookmarks, isLoading: isLoadingBookmarks, revalidate } = useBookmarks(groupId);

  React.useEffect(() => {
    if (groups && groups.length > 0) {
      setGroupId(groups[0].id);
    }
  }, [groups]);

  return (
    <List
      isLoading={isLoadingGroups || isLoadingBookmarks}
      searchBarAccessory={
        <List.Dropdown tooltip="Groups" value={groupId} onChange={setGroupId}>
          {groups &&
            groups.map((group) => {
              return <List.Dropdown.Item key={group.id} title={group.name || ""} value={group.id} />;
            })}
        </List.Dropdown>
      }
    >
      {bookmarks &&
        bookmarks.map((bookmark) => {
          const hostname = bookmark.type === "link" ? getHostname(bookmark.url || "") : "";
          let icon: Image.ImageLike = Icon.Bookmark;

          if (bookmark.favicon_url) {
            icon = bookmark.favicon_url;
          }
          if (bookmark.type === "color") {
            icon = { source: Icon.CircleFilled, tintColor: bookmark.title };
          }
          if (bookmark.type === "text") {
            icon = Icon.Paragraph;
          }

          return (
            <List.Item
              key={bookmark.id}
              title={bookmark.title ? bookmark.title : hostname}
              icon={icon}
              subtitle={hostname}
              actions={
                <ActionPanel>
                  {bookmark.type === "link" && bookmark.url && (
                    <>
                      <Action.OpenInBrowser url={bookmark.url} />
                      <Action.CopyToClipboard title="Copy URL to Clipboard" content={bookmark.url} />
                    </>
                  )}
                  {bookmark.type !== "link" && bookmark.title && <Action.CopyToClipboard content={bookmark.title} />}

                  <Action
                    style={Action.Style.Destructive}
                    title="Delete"
                    icon={Icon.Trash}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={async () => {
                      if (bookmark.id) {
                        showToast({ title: "Deleting bookmark...", style: Toast.Style.Animated });
                        const res = await deleteBookmark(bookmark.id);
                        revalidate();
                        res.error
                          ? showToast({ title: "Failed to delete bookmark", style: Toast.Style.Failure })
                          : showToast({ title: "Bookmark deleted", style: Toast.Style.Success });
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

export default function AuthenticatedBookmark() {
  const { data, isLoading, error } = useAuth();

  const markdown = error?.message.includes("Invalid login credentials")
    ? error.message + ". Please open the preferences and try again."
    : error?.message;

  if (isLoading) {
    return <Detail isLoading />;
  }

  if (error) {
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (data?.user) {
    return <SearchBookmarks user={data.user} />;
  }
}
