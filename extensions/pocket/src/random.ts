import { Toast, ToastStyle } from "@raycast/api";
import { fetchBookmarks } from "./utils/api";
import { runAppleScript } from "run-applescript";

export default async function () {
  const toast = new Toast({
    title: "Searching bookmarks",
    style: ToastStyle.Animated,
  });
  toast.show();

  const bookmarks = await fetchBookmarks({ count: 1 });

  if (bookmarks.length === 0) {
    toast.style = ToastStyle.Failure;
    toast.title = "No bookmarks found";
  } else {
    const bookmark = bookmarks[0];
    await runAppleScript(`open location "${bookmark.pocketUrl}"`);
  }
}
