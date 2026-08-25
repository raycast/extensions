import { Toast, getPreferenceValues, showHUD, showToast } from "@raycast/api";

import {
  buildFinderFolderImportPreview,
  countFinderFolderImportStatuses,
  finderFolderImportDestinations,
} from "./domain/finder-folder-import";
import { saveDestinationLibrary } from "./services/destination-library";
import { getDestinations } from "./services/destination-repository";
import { getFinderSelection } from "./services/finder-selection";
import { isDirectory } from "./services/filesystem";

export default async function Command() {
  const { destinationsCsvFile, newFinderFoldersCopy, newFinderFoldersMove, newFinderFoldersPinned } =
    getPreferenceValues<Preferences.AddSelectedFinderFolders>();

  try {
    const paths = await getFinderSelection();
    if (paths.length === 0) {
      throw new Error("Select one or more folders in Finder, then run this command again.");
    }

    const current = await getDestinations();
    const preview = await buildFinderFolderImportPreview(paths, current, isDirectory, {
      copy: newFinderFoldersCopy,
      move: newFinderFoldersMove,
      pinned: newFinderFoldersPinned,
    });
    const additions = finderFolderImportDestinations(preview);
    const counts = countFinderFolderImportStatuses(preview);
    if (additions.length === 0) {
      throw new Error(
        `No new folders to add. ${counts.duplicate} already saved or repeated selection${counts.duplicate === 1 ? "" : "s"}; ${counts.notFolder} file or inaccessible item${counts.notFolder === 1 ? "" : "s"}.`,
      );
    }

    await saveDestinationLibrary([...current, ...additions], destinationsCsvFile);
    const skipped = counts.duplicate + counts.notFolder;
    await showHUD(
      `Added ${additions.length} destination${additions.length === 1 ? "" : "s"}${skipped > 0 ? ` · ${skipped} skipped` : ""}`,
    );
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could Not Add Finder Folders",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
