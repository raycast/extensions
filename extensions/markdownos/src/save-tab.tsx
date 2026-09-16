import { BrowserExtension, showToast, Toast } from "@raycast/api";
import { getVaultPath, isValidVault } from "./vault";
import { addBookmark, setBookmarkArchived } from "./bookmarks";

export default async function Command() {
  const vaultPath = getVaultPath();
  if (!isValidVault(vaultPath)) {
    await showToast({ style: Toast.Style.Failure, title: "This doesn't look like a MarkdownOS vault" });
    return;
  }

  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving current tab…" });

  let tabs;
  try {
    tabs = await BrowserExtension.getTabs();
  } catch {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't read the browser tab";
    toast.message = "Install Raycast's Browser Extension to use this command.";
    return;
  }

  const activeTab = tabs.find((tab) => tab.active);
  if (!activeTab) {
    toast.style = Toast.Style.Failure;
    toast.title = "No active browser tab found";
    return;
  }

  let result;
  try {
    result = await addBookmark(vaultPath, activeTab.url, activeTab.title ?? "");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't save the bookmark";
    toast.message = error instanceof Error ? error.message : String(error);
    return;
  }

  if (result.status === "invalid-url") {
    toast.style = Toast.Style.Failure;
    toast.title = "That doesn't look like a valid URL";
    return;
  }

  if (result.status === "duplicate") {
    const archived = result.existing.archivedAt !== null;
    toast.style = Toast.Style.Failure;
    toast.title = archived ? "Already saved (archived)" : "Already saved";
    toast.message = result.existing.title;
    if (archived) {
      toast.primaryAction = {
        title: "Restore",
        onAction: async () => {
          await setBookmarkArchived(vaultPath, result.existing.id, false);
          await showToast({ style: Toast.Style.Success, title: "Restored", message: result.existing.title });
        },
      };
    }
    return;
  }

  toast.style = Toast.Style.Success;
  toast.title = "Saved";
  toast.message = result.bookmark.title;
}
