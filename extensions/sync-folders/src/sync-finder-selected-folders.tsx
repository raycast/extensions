import { getPreferenceValues, getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { executeRsync } from "./utils";

interface Preferences {
  sync_finder_selected_folders_delete_files: boolean;
}

export default async function Command() {
  const { sync_finder_selected_folders_delete_files = false } = getPreferenceValues<Preferences>();

  try {
    const filePaths = (await getSelectedFinderItems()).map((f) => f.path);
    if (filePaths.length >= 2) {
      const source_folder = filePaths[0];
      const dest_folder = filePaths[1];

      const syncFolder = {
        name: "Sync Finder Selected Folders",
        source_folder,
        dest_folder,
        delete_dest: sync_finder_selected_folders_delete_files,
      };

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Syncing folders",
        message: "Syncing folders...",
      });

      executeRsync(syncFolder, (error, stdout, stderr) => {
        if (error) {
          toast.style = Toast.Style.Failure;
          toast.title = "Error";
          toast.message = `An error occurred during the execution of the command ${error}`;

          console.error(`An error occurred during the execution of the command: ${error}`);
          return;
        }
        if (stderr) {
          toast.style = Toast.Style.Failure;
          toast.title = "Error";
          toast.message = stderr;

          console.error(stderr);
          return;
        }
        toast.style = Toast.Style.Success;
        toast.title = "Folders synced";
      });

      await showHUD("Folders synced 🙌");
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select at least two folders",
        message: "Please select at least two folders",
      });
    }
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No finder items selected",
      message: e instanceof Error ? e.message : "Could not get the selected Finder items",
    });
  }
}
