import { Clipboard, getFrontmostApplication, open, showToast, Toast } from "@raycast/api";
import { getCurrentTab, isSupportedBrowser } from "./lib/browser";
import { createPocketClient } from "./lib/oauth/client";

export default async function saveBrowserTabBookmark() {
  const pocket = await createPocketClient();

  const browser = await getFrontmostApplication();
  if (!isSupportedBrowser(browser.bundleId)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Browser app not supported",
      message: `Cannot get the URL from ${browser.name}`,
    });
    return;
  }

  const url = await getCurrentTab(browser.bundleId);

  const toast = await showToast({
    title: "Creating bookmark",
    style: Toast.Style.Animated,
    message: url,
  });

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
