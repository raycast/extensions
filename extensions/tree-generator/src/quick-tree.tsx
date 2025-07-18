import { showHUD, Clipboard } from "@raycast/api";
import { TreeGenerator, DirectoryUtils, PreferenceUtils } from "./utils";

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

    // Copy to clipboard
    await Clipboard.copy(result.treeString);

    await showHUD(`Tree copied to clipboard!`);
  } catch (error) {
    await showHUD(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
