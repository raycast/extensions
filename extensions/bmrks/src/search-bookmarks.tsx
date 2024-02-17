import React from "react";
import { User } from "@supabase/supabase-js";
import { Action, ActionPanel, Detail, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useAuth } from "../lib/use-auth";
import { useGroups } from "../lib/use-groups";
import { useBookmarks } from "../lib/use-bookmarks";
import { getHostname } from "../lib/getHostname";

export function SearchBookmarks({ user }: { user: User }) {
  const { data: groups, isLoading: isLoadingGroups } = useGroups(user);
  const [groupId, setGroupId] = React.useState<string | undefined>("");
  const { data: bookmarks, isLoading: isLoadingBookmarks } = useBookmarks(groupId);

  React.useEffect(() => {
    if (groups.length > 0) {
      setGroupId(groups[0].id);
    }
  }, [groups]);

  return (
    <List
      isLoading={isLoadingGroups || isLoadingBookmarks}
      searchBarAccessory={
        <List.Dropdown tooltip="Groups" value={groupId} onChange={setGroupId}>
          {groups.map((group) => {
            return <List.Dropdown.Item key={group.id} title={group.name || ""} value={group.id} />;
          })}
        </List.Dropdown>
      }
    >
      {bookmarks.length > 0 &&
        bookmarks.map((bookmark) => {
          const hostname = bookmark.type === "link" ? getHostname(bookmark.url || "") : "";
          let icon;
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
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

export default function AuthenticatedBookmark() {
  const { error, user } = useAuth();

  const markdown =
    error === "Invalid login credentials" ? error + ". Please open the preferences and try again." : error;

  if (error) {
    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  if (user) {
    return <SearchBookmarks user={user} />;
  }

  return <Detail isLoading />;
}
