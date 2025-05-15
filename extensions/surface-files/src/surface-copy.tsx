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
    // Validate extension input
    if (!isValidExtension(extension)) return showInvalidExtensionToast();

    const selected = await getSelectedFinderItems();
    if (!selected.length) return showNoFolderSelectedToast();

    // Folder and extension setup
    const folder = selected[0].path;
    const ext = "." + extension.replace(/^\./, "");
    const parent = path.dirname(folder);
    const dest = path.join(parent, getDestinationFolderName(folderName, ext));

    // Collect all files to copy
    const filesToCopy: { src: string; dest: string }[] = [];
    for await (const filePath of walk(folder, includeHiddenFiles)) {
      if (filePath.endsWith(ext)) {
        const fileName = path.basename(filePath);
        const uniqueDest = await getUniqueDest(dest, fileName);
        filesToCopy.push({ src: filePath, dest: uniqueDest });
      }
    }

    // Feedback if no files found
    if (filesToCopy.length === 0) return showNoMatchingFilesToast();

    // Confirm if the number of files exceeds the limit
    if (filesToCopy.length > CONFIRM_LIMIT) {
      const confirmed = await confirmAlert({
        title: "Many files found",
        message: `You are about to copy ${filesToCopy.length} files. Continue?`,
      });
      if (!confirmed) return;
    }

    // Create destination folder if it doesn't exist
    try {
      await fs.mkdir(dest, { recursive: true });
    } catch {
      return showFailedToCreateDestToast(dest);
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
    if (failed > 0) message += ` ${failed} file(s) could not be copied.`;

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
