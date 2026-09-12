import { showToast, Toast } from "@raycast/api";
import { getVaultPath, isValidVault } from "./vault";
import { openInApp } from "./app-link";

/*
 * `no-view`, matching Open Bookmarks: there is exactly one thing this command does, so a list with
 * a single row to press was only a step in the way of doing it.
 *
 * The note itself is created by the app, not here. Writing the file from this side would leave it
 * unknown to the app's own note index until its vault watcher next fired, which is a race against
 * the window that is being opened to show it.
 */
export default async function Command() {
  const vaultPath = getVaultPath();
  if (!isValidVault(vaultPath)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "This doesn't look like a MarkdownOS vault",
      message: `No .markdownos folder found in ${vaultPath}.`,
    });
    return;
  }
  await openInApp(vaultPath, { type: "new-note", window: "new" });
}
