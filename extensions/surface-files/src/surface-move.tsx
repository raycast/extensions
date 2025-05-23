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
  getDestinationFolderName,
  showInvalidExtensionToast,
  showNoFolderSelectedToast,
  showNoMatchingFilesToast,
  showFailedToCreateDestToast,
} from "./file-utils";

// Preferences
const { confirmLimit, folderName, includeHiddenFiles } = getPreferenceValues<{
  confirmLimit: string;
  folderName: string;
  includeHiddenFiles: boolean;
}>();

const CONFIRM_LIMIT = Number(confirmLimit) > 0 ? Number(confirmLimit) : 20;

export default function Command() {
  async function handleSubmit({ extension }: { extension: string }) {
    if (!isValidExtension(extension)) return showInvalidExtensionToast();

    let selected;
    try {
      selected = await getSelectedFinderItems();
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Finder is not active",
        message: "Please make Finder the frontmost application and select a folder.",
      });
      return;
    }
    if (!selected.length) return showNoFolderSelectedToast();

    // Check if selected is a folder
    const folder = selected[0].path;
    const stats = await fs.stat(folder);
    if (!stats.isDirectory()) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select a folder",
      });
      return;
    }

    // Folder and extension setup
    const ext = "." + extension.replace(/^\./, "");
    const parent = path.dirname(folder);
    const dest = path.join(parent, getDestinationFolderName(folderName, ext));

    // Collect all files to process
    const filesToMove: { src: string; dest: string }[] = [];
    for await (const filePath of walk(folder, includeHiddenFiles)) {
      if (filePath.endsWith(ext)) {
        const fileName = path.basename(filePath);
        const uniqueDest = await getUniqueDest(dest, fileName);
        filesToMove.push({ src: filePath, dest: uniqueDest });
      }
    }

    // Feedback if no files found
    if (filesToMove.length === 0) return showNoMatchingFilesToast();

    // Confirm if the number of files exceeds the limit
    if (filesToMove.length > CONFIRM_LIMIT) {
      const confirmed = await confirmAlert({
        title: "Many files found",
        message: `You are about to move ${filesToMove.length} files. Continue?`,
      });
      if (!confirmed) return;
    }

    // Create destination folder if it doesn't exist
    try {
      await fs.mkdir(dest, { recursive: true });
    } catch {
      return showFailedToCreateDestToast(dest);
    }

    // Move files with error handling and progress
    const { success, failed } = await processFilesWithErrorsAndProgress(filesToMove, fs.rename, (current, total) => {
      if (total > 10 && current % 10 === 0) {
        showToast({
          style: Toast.Style.Animated,
          title: "Moving files...",
          message: `${current} / ${total}`,
        });
      }
    });

    let message = `${success} file(s) moved to ${dest}.`;
    if (failed > 0) message += ` ${failed} file(s) could not be moved.`;

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
          <Action.SubmitForm title="Surface & Move" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="extension" title="File extension (e.g. png)" placeholder="png" />
    </Form>
  );
}
