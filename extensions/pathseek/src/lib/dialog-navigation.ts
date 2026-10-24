import path from "node:path";

/**
 * Dialog navigation is deliberately a text-only assisted workflow.
 * No AppleScript, Accessibility automation, keyboard injection, Finder
 * opening or Open/Save confirmation is performed here.
 *
 * Paste the full selected path as the primary action. Standard macOS Open
 * dialogs may highlight the exact file; a selected directory opens via
 * Go to Folder. Parent directory remains an explicit fallback action.
 * File selection must be verified on the user's Mac, not assumed for
 * every third-party application or Save panel.
 */
export function getDialogNavigationPaths(filepath: string): {
  containingFolder: string;
  selectedPath: string;
} {
  if (!path.isAbsolute(filepath) || filepath.includes("\0")) {
    throw new Error("Dialog navigation requires an absolute local path");
  }

  return { containingFolder: path.dirname(filepath), selectedPath: filepath };
}
