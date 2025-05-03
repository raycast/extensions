import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { Preferences, rebuildIndex, getIndexFilePath } from "./utils";

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { rootFolder } = preferences;
  const indexFilePath = getIndexFilePath(preferences);

  try {
    rebuildIndex(rootFolder, indexFilePath);
    showToast({
      title: "Index rebuilt successfully",
      style: Toast.Style.Success,
      message: `Index saved to: ${indexFilePath}`,
    });
  } catch (error) {
    showToast({
      title: "Failed to rebuild index",
      style: Toast.Style.Failure,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return null;
}
