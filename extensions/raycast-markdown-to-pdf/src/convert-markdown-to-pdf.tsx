import { Toast, closeMainWindow, getSelectedFinderItems, getPreferenceValues, openExtensionPreferences, showHUD, showToast } from "@raycast/api";
import { access } from "node:fs/promises";
import path from "node:path";
import { convertMarkdownBatchToPdf } from "./lib/conversion";

export default async function Command() {
  await closeMainWindow({ clearRootSearch: true });

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Rendering PDFs",
  });

  try {
    const selectedItems = await getSelectedFinderItems();
    const markdownItems = selectedItems.filter((item) => /\.(md|markdown|mdown)$/i.test(item.path));

    if (markdownItems.length === 0) {
      throw new Error("Select one or more Markdown files in Finder, then run the command again.");
    }

    const preferredBrowser = getPreferenceValues<Preferences.ConvertMarkdownToPdf>().preferredBrowser;
    for (const markdownItem of markdownItems) {
      await access(markdownItem.path);
    }

    const results = await convertMarkdownBatchToPdf({
      markdownPaths: markdownItems.map((item) => item.path),
      pageSize: "letter",
      preferredBrowserPath: preferredBrowser?.path,
      concurrency: Math.min(4, markdownItems.length),
      onProgress(progress) {
        toast.message = `${progress.completed}/${progress.total} ${path.basename(progress.currentFile)}`;
      },
    });

    toast.style = Toast.Style.Success;
    toast.title = markdownItems.length === 1 ? "PDF created" : "PDFs created";
    toast.message =
      markdownItems.length === 1
        ? `${path.basename(markdownItems[0].path, path.extname(markdownItems[0].path))}.pdf`
        : `${results.length} files exported`;
    await showHUD(markdownItems.length === 1 ? `Created ${toast.message}` : `Created ${results.length} PDFs`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    toast.style = Toast.Style.Failure;
    toast.title = "Export failed";
    toast.message = message;

    if (message.includes("No supported Chromium-based browser")) {
      await openExtensionPreferences();
    }
  }
}
