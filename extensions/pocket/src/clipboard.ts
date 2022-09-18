import { Clipboard, open, Toast } from "@raycast/api";
import { createBookmark } from "./utils/api";
import { HTTPError } from "got";
import isUrl from "is-url";

export default async function () {
  const toast = new Toast({
    title: "Creating bookmark",
    style: Toast.Style.Animated,
  });

  toast.show();

  const url = await Clipboard.readText();
  if (!url || !isUrl(url)) {
    toast.style = Toast.Style.Failure;
    toast.title = "Clipboard text isn't a URL";
    toast.message = url;
    return;
  }

  toast.message = url;

  try {
    const bookmark = await createBookmark({ url });
    toast.style = Toast.Style.Success;
    toast.title = "Bookmark created";
    toast.message = bookmark.title ?? bookmark.url;
    toast.primaryAction = {
      title: "Open in Pocket",
      shortcut: { modifiers: ["cmd", "shift"], key: "o" },
      onAction: () => {
        open(bookmark.pocketUrl);
      },
    };
    toast.secondaryAction = {
      title: "Copy Pocket URL",
      shortcut: { modifiers: ["cmd", "shift"], key: "c" },
      onAction: () => {
        Clipboard.copy(bookmark.pocketUrl);
      },
    };
  } catch (error) {
    toast.style = Toast.Style.Failure;

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
