import { open, showToast, Toast } from "@raycast/api";
import { createPocketClient } from "./lib/oauth/client";

export default async function openLatestBookmark() {
  const pocket = await createPocketClient();

  const toast = await showToast({
    title: "Searching bookmarks",
    style: Toast.Style.Animated,
  });

  const bookmarks = await pocket.getBookmarks({ count: 1 });

  if (bookmarks.length === 0) {
    toast.style = Toast.Style.Failure;
    toast.title = "No bookmarks found";
  } else {
    toast.style = Toast.Style.Success;
    toast.title = "Bookmark opened";
    const bookmark = bookmarks[0];
    await open(bookmark.pocketUrl);
  }
}
