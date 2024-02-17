import React from "react";
import { useCachedState } from "@raycast/utils";
import { Toast, showToast } from "@raycast/api";
import * as db from "../lib/db";

export function useBookmarks(groupId?: string) {
  const [bookmarks, setBookmarks] = useCachedState<Omit<db.Bookmark, "user_id">[]>("bookmarks-" + groupId, []);

  React.useEffect(() => {
    (async () => {
      if (!groupId) {
        return;
      }

      const { data, error } = await db.getBookmarksByGroupId(groupId);

      if (error) {
        await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error.message });
        return;
      }

      setBookmarks(data);
    })();
  }, [groupId]);

  return bookmarks;
}
