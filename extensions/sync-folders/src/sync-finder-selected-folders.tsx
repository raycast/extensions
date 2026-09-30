import { getPreferenceValues, getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { executeRsync } from "./utils";

export default async function Command() {
  const { sync_finder_selected_folders_delete_files = false } =
    getPreferenceValues<Preferences.SyncFinderSelectedFolders>();

  try {
    const filePaths = (await getSelectedFinderItems()).map((f) => f.path);
    if (filePaths.length >= 2) {
      const source_folder = filePaths[0];
      const dest_folder = filePaths[1];

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Syncing folders",
        message: "Syncing folders...",
      });

      const result = await executeRsync({
        name: "Sync Finder Selected Folders",
        source_folder,
        dest_folder,
        delete_dest: sync_finder_selected_folders_delete_files,
      });

      if (result.success) {
        toast.style = Toast.Style.Success;
        toast.title = "Folders synced";
        await showHUD("Folders synced 🙌");
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Error";
        toast.message = result.error ?? "Unknown error";
      }
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
