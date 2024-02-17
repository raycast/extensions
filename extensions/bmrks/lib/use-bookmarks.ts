import React from "react";
import { useCachedState } from "@raycast/utils";
import { Toast, showToast } from "@raycast/api";
import * as db from "../lib/db";

export function useBookmarks(groupId?: string) {
  const [bookmarks, setBookmarks] = useCachedState<Omit<db.Bookmark, "user_id">[]>("bookmarks-" + groupId, []);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      setIsLoading(true);

      if (!groupId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await db.getBookmarksByGroupId(groupId);

      setIsLoading(false);

      if (error) {
        await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error.message });
        return;
      }

      setBookmarks(data);
    })();
  }, [groupId]);

  return { data: bookmarks, isLoading };
}
