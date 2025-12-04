import { Clipboard, open, showToast, Toast } from "@raycast/api";
import isUrl from "is-url";
import { createPocketClient } from "./lib/oauth/client";

export default async function saveClipboardBookmark() {
  const pocket = await createPocketClient();

  const toast = await showToast({
    title: "Creating bookmark",
    style: Toast.Style.Animated,
  });

  const url = await Clipboard.readText();
  if (!url || !isUrl(url)) {
    toast.style = Toast.Style.Failure;
    toast.title = "Clipboard text isn't a URL";
    toast.message = url;
    return;
  }

  toast.message = url;

  const bookmark = await pocket.createBookmark({ url });

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
}
