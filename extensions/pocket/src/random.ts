import { open, showToast, Toast } from "@raycast/api";
import { ReadState } from "./lib/api";
import { sample } from "lodash";
import { createPocketClient } from "./lib/oauth/client";

export default async function openRandomBookmark() {
  const pocket = await createPocketClient();

  const toast = await showToast({
    title: "Searching bookmarks",
    style: Toast.Style.Animated,
  });

  const bookmarks = await pocket.getBookmarks({ state: ReadState.Unread });

  if (bookmarks.length === 0) {
    toast.style = Toast.Style.Failure;
    toast.title = "No bookmarks found";
  } else {
    toast.style = Toast.Style.Success;
    toast.title = "Bookmark opened";
    const bookmark = sample(bookmarks)!;
    await open(bookmark.pocketUrl);
  }
}
