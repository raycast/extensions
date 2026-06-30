import { closeMainWindow, getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getEditorPreference, openDiffInEditor } from "./editor";

export default async function main() {
  let filePaths: string[];
  try {
    filePaths = (await getSelectedFinderItems()).map((item) => item.path);
  } catch (error) {
    await showFailureToast(error, { title: "Could not get the selected Finder items" });
    return;
  }

  if (filePaths.length !== 2) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Select exactly two files",
      message: "Select two files in Finder to compare them in your editor.",
    });
    return;
  }

  try {
    const editor = getEditorPreference();
    await openDiffInEditor(editor, filePaths[0], filePaths[1]);
    await closeMainWindow({ clearRootSearch: true });
    await showHUD("Diff view opened in Editor.");
  } catch (error) {
    await showFailureToast(error, { title: "Failed to open files in Editor" });
  }
}
