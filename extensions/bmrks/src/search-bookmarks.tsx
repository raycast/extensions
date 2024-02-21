import React from "react";
import { User } from "@supabase/supabase-js";
import { Action, ActionPanel, Icon, Image, List, Toast, showToast } from "@raycast/api";
import { useGroups } from "../lib/use-groups";
import { useBookmarks } from "../lib/use-bookmarks";
import { getHostname } from "../lib/get-hostname";
import { deleteBookmark, moveBookmarkToGroup } from "../lib/db";
import AuthenticatedView from "./components/AuthenticatedView";

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
                    title="Delete Bookmark"
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
                  <ActionPanel.Section>
                    <ActionPanel.Submenu title="Move to Group" icon={Icon.ArrowRight}>
                      {groups &&
                        groups.map((group) => {
                          if (group.id === groupId) {
                            return null;
                          }
                          return (
                            <Action
                              key={group.id}
                              title={group.name}
                              onAction={async () => {
                                if (bookmark.id) {
                                  showToast({ title: "Moving bookmark...", style: Toast.Style.Animated });
                                  const res = await moveBookmarkToGroup(bookmark.id, group.id);
                                  revalidate();
                                  res.error
                                    ? showToast({ title: "Failed to move bookmark", style: Toast.Style.Failure })
                                    : showToast({ title: `Moved to ${group.name}`, style: Toast.Style.Success });
                                }
                              }}
                            />
                          );
                        })}
                    </ActionPanel.Submenu>
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

export default function Command() {
  return <AuthenticatedView component={SearchBookmarks} />;
}
