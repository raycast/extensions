/**
 * Replace in Folder Names command — the Replace in File Names flow
 * filtered to the folders in the Finder selection.
 */

import ReplaceCharacters from "./replace";

export default function ReplaceInFolderNames() {
  return <ReplaceCharacters foldersOnly />;
}
