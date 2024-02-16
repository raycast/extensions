import { Action, ActionPanel, List, Toast, showHUD, showToast } from "@raycast/api";
import { useGroups } from "../lib/use-groups";
import { useCachedState } from "@raycast/utils";
import * as db from "../lib/db";
import React from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/use-auth";

export default function SearchBookmarks() {
  const { error, user } = useAuth();
  const groups = useGroups(user);
  const [groupId, setGroupId] = React.useState<string | undefined>();
  // const groupId = "5d4928ef-6c09-4db6-8566-91f932a7e164";
  const bookmarks = useBookmarks(groupId);

  return (
    <List
      navigationTitle="Search Groups"
      searchBarPlaceholder="Search your groups"
      isLoading={bookmarks.length === 0}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Groups"
          onChange={(newId) => {
            setGroupId(newId);
          }}
        >
          {groups.length > 0 &&
            groups.map((group) => {
              return <List.Dropdown.Item key={group.id} title={group.name || ""} value={group.id} />;
            })}
        </List.Dropdown>
      }
    >
      {bookmarks.length > 0 &&
        bookmarks.map((bookmark) => {
          const hostname = bookmark.type === "link" ? getUrlHostname(bookmark!.url) : "";
          return (
            <List.Item
              key={bookmark.id}
              title={bookmark.title ? bookmark.title : hostname}
              icon={bookmark.favicon_url}
              subtitle={hostname}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser url={bookmark.url} />
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}

export function useBookmarks(groupId: string) {
  const [bookmarks, setBookmarks] = useCachedState<Omit<db.Bookmark, "user_id">[]>("bookmarks-" + groupId, []);

  React.useEffect(() => {
    (async () => {
      if (!groupId) {
        // await showToast({
        //   title: "Error",
        //   message: "Missing group id",
        //   style: Toast.Style.Failure,
        // });
        return;
      }

      const userRes = await supabase.auth.getUser();

      if (!userRes.data.user) {
        return;
      }

      const { data, error } = await db.getBookmarksByGroupId(groupId);

      if (error) {
        showHUD(error.message);
        return;
      }

      setBookmarks(data);
    })();
  }, [groupId]);

  return bookmarks;
}

export function getUrlHostname(url: string) {
  return url.replace(/^(?:https?:\/\/)?(?:www\.)?/i, "").split("/")[0];
}
