import { open, Toast, ToastStyle } from "@raycast/api";
import { fetchBookmarks } from "./utils/api";
import { HTTPError } from "got";

export default async function () {
  const toast = new Toast({
    title: "Searching bookmarks",
    style: ToastStyle.Animated,
  });

  toast.show();

  try {
    const bookmarks = await fetchBookmarks({ count: 1 });

    if (bookmarks.length === 0) {
      toast.style = ToastStyle.Failure;
      toast.title = "No bookmarks found";
    } else {
      const bookmark = bookmarks[0];
      await open(bookmark.pocketUrl);
    }
  } catch (error) {
    toast.style = ToastStyle.Failure;

    if (error instanceof HTTPError) {
      if (error.response.statusCode === 401 || error.response.statusCode === 403) {
        toast.title = "Invalid Credentials";
        toast.message = "Check you Pocket extension preferences";
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }
}
