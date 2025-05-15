import {
  Form,
  ActionPanel,
  Action,
  showToast,
  getSelectedFinderItems,
  popToRoot,
  Toast,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
} from "@raycast/api";
import fs from "fs/promises";
import path from "path";
import {
  walk,
  getUniqueDest,
  processFilesWithErrorsAndProgress,
  isValidExtension,
  showInvalidExtensionToast,
  showNoFolderSelectedToast,
  showNoMatchingFilesToast,
  showFailedToCreateDestToast,
  parseExcludedExtensions,
  isExcludedExtension,
} from "./file-utils";

// Preferences
const preferences = getPreferenceValues<{ confirmLimit: string; excludeExtensions?: string }>();
const parsedLimit = Number(preferences.confirmLimit);
const CONFIRM_LIMIT = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 20;
const excludedExtensions = parseExcludedExtensions(preferences.excludeExtensions);

export default function Command() {
  async function handleSubmit(values: { extension: string }) {
    // Validate extension input
    if (!isValidExtension(values.extension)) {
      showInvalidExtensionToast();
      return;
    }

    const selected = await getSelectedFinderItems();
    if (!selected.length) {
      showNoFolderSelectedToast();
      return;
    }
    const folder = selected[0].path;
    const ext = "." + values.extension.replace(/^\./, "");

    // Destination folder one level above the selected folder
    const parent = path.dirname(folder);
    const dest = path.join(parent, `x_${ext.replace(".", "")}`);
    try {
      await fs.mkdir(dest, { recursive: true });
    } catch {
      showFailedToCreateDestToast(dest);
      return;
    }

    // Collect all files to copy
    const filesToCopy: { src: string; dest: string }[] = [];
    for await (const filePath of walk(folder)) {
      const fileExt = path.extname(filePath).toLowerCase();
      if (filePath.endsWith(ext) && !isExcludedExtension(fileExt, excludedExtensions)) {
        const fileName = path.basename(filePath);
        const uniqueDest = await getUniqueDest(dest, fileName);
        filesToCopy.push({ src: filePath, dest: uniqueDest });
      }
    }

    // Feedback if no files found
    if (filesToCopy.length === 0) {
      showNoMatchingFilesToast();
      return;
    }

    // Confirm if the number of files exceeds the limit
    if (filesToCopy.length > CONFIRM_LIMIT) {
      const confirmed = await confirmAlert({
        title: "Many files found",
        message: `You are about to copy ${filesToCopy.length} files. Continue?`,
      });
      if (!confirmed) return;
    }

    // Collect all files to process
    const { success, failed } = await processFilesWithErrorsAndProgress(filesToCopy, fs.copyFile, (current, total) => {
      if (total > 10 && current % 10 === 0) {
        showToast({
          style: Toast.Style.Animated,
          title: "Copying files...",
          message: `${current} / ${total}`,
        });
      }
    });

    let message = `${success} file(s) copied to ${dest}.`;
    if (failed > 0) {
      message += ` ${failed} file(s) could not be copied.`;
    }

    showToast({
      style: failed > 0 ? Toast.Style.Failure : Toast.Style.Success,
      title: failed > 0 ? "Done with errors" : "Done",
      message,
    });
    popToRoot();
    closeMainWindow();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Surface & Copy" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="extension" title="File extension (e.g. png)" placeholder="png" />
    </Form>
  );
}
