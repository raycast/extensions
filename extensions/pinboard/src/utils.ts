import he from "he";
import { Bookmark, BookmarksResponse } from "./types";
import { Toast, showToast } from "@raycast/api";
import { deleteBookmark } from "./api";

export function extractDocumentTitle(document: string): string {
  const title = document.match(/<title>(.*?)<\/title>/)?.[1] ?? "";
  return he.decode(title);
}

export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch (err) {
    return false;
  }
}

export async function deleteItem(props: { bookmark: Bookmark; mutate: any }) {
  const { bookmark, mutate } = props;
  const toast = await showToast({ title: "Deleting bookmark...", style: Toast.Style.Animated });

  try {
    await mutate(deleteBookmark(bookmark), {
      optimisticUpdate(data?: BookmarksResponse) {
        if (data) {
          return {
            ...data,
            bookmarks: data.bookmarks.filter((bookmarkItem) => bookmarkItem.url !== bookmark.url),
          };
        }
      },
    });

    toast.style = Toast.Style.Success;
    toast.title = "Successfully deleted bookmark";
  } catch (error) {
    console.error("deleteItem error", error);
    toast.title = "Could not delete bookmark";
    toast.message = String(error);
    toast.style = Toast.Style.Failure;
  }
}
