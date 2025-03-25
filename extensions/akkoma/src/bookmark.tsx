import { useEffect, useState } from "react";
import { Action, ActionPanel, List, Toast, showToast, Cache } from "@raycast/api";

import { Status, AkkomaError } from "./utils/types";
import apiServer from "./utils/api";
import { getAccessToken } from "./utils/oauth";
import { statusParser } from "./utils/util";

const cache = new Cache();

export default function BookmarkCommand() {
  const cached = cache.get("latest_bookmarks");
  const [bookmarks, setBookmarks] = useState<Status[]>(cached ? JSON.parse(cached) : []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getBookmark = async () => {
      try {
        await getAccessToken();
        showToast(Toast.Style.Animated, "Loading bookmarks...");
        const newBookmarks = await apiServer.fetchBookmarks();
        setBookmarks(newBookmarks);
        showToast(Toast.Style.Success, "Bookmarked has been loaded");
        cache.set("latest_bookmarks", JSON.stringify(newBookmarks));
      } catch (error) {
        const requestErr = error as AkkomaError;
        showToast(Toast.Style.Failure, "Error", requestErr.error);
      } finally {
        setIsLoading(false);
      }
    };
    getBookmark();
  }, []);

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder="Search bookmarks">
      {bookmarks?.map((bookmark) => (
        <List.Item
          title={bookmark.pleroma.content["text/plain"] || bookmark.akkoma.source.content}
          key={bookmark.id}
          detail={<List.Item.Detail markdown={statusParser(bookmark, "idAndDate")} />}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Original Status" url={bookmark.url} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
