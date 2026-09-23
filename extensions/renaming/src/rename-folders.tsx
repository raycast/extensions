/**
 * Rename Folder(s) command — the Rename File(s) flow filtered to the
 * folders in the Finder selection.
 */

import RenameFiles from "./index";

export default function RenameFolders() {
  return <RenameFiles foldersOnly />;
}
