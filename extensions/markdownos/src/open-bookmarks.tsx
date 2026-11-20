import { showToast, Toast } from "@raycast/api";
import { getVaultPath, isValidVault } from "./vault";
import { openInApp } from "./app-link";

/*
 * `no-view`, unlike the other commands: there is exactly one thing to do and no choice to offer,
 * so a list with a single row to press would only be a step in the way. Bookmarks is a section of
 * the app's main window, so "in a new window" isn't a destination that exists.
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
  await openInApp(vaultPath, { type: "bookmarks" });
}
