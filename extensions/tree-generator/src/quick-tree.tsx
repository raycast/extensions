import { showHUD, Clipboard } from "@raycast/api";
import { TreeGenerator, DirectoryUtils, PreferenceUtils } from "./utils";
import { showFailureToast } from "@raycast/utils";

/**
 * Quick command to generate tree for current directory
 */
export default async function QuickTreeCommand() {
  try {
    // Get current directory (selected Finder items or current directory)
    const rootPath = await DirectoryUtils.getCurrentDirectorySilent();

    // Get options from preferences
    const options = PreferenceUtils.getQuickTreeOptions(rootPath);

    const generator = new TreeGenerator(options);
    const result = await generator.generateTree();

    // Validate that we actually have content to copy
    if (!result.treeString || result.treeString.trim().length === 0) {
      await showFailureToast("No accessible files or directories found", {
        title: "Empty tree result",
      });
      return;
    }

    // Check if there were significant errors during generation
    if (result.hasErrors && result.skippedCount > 0) {
      await showFailureToast("Some files or directories could not be accessed due to permission errors", {
        title: "Tree generation error",
      });

      // Still copy to clipboard but show it as a warning
      await Clipboard.copy(result.treeString);
      return;
    }

    // Copy to clipboard
    await Clipboard.copy(result.treeString);

    // Show detailed success message
    const fileText = result.fileCount === 1 ? "file" : "files";
    const dirText = result.dirCount === 1 ? "directory" : "directories";
    const message = `${result.fileCount} ${fileText}, ${result.dirCount} ${dirText}`;

    await showHUD(`Tree copied! ${message}`);
  } catch (error) {
    await showFailureToast(error, { title: "Could not generate tree" });
  }
}
