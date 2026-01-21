import { getSelectedFinderItems, showToast, Toast, Clipboard, showHUD, getPreferenceValues } from "@raycast/api";

interface Preferences {
  startsWith: string;
  prefix: string;
}

function transformPath(filePath: string, startsWith: string, prefix: string): string {
  // If no settings configured, return the original path
  if (!startsWith || !prefix) {
    return filePath;
  }

  // Find the position of the "startsWith" value in the path
  const index = filePath.indexOf(startsWith);

  if (index === -1) {
    // If the startsWith value is not found, return original path
    return filePath;
  }

  // Extract the path from the startsWith position, encode it, and prepend the prefix
  const relativePath = filePath.substring(index);
  const encodedPath = encodeURI(relativePath);
  return prefix + encodedPath;
}

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No file selected",
        message: "Please select a file in Finder first",
      });
      return;
    }

    const preferences = getPreferenceValues<Preferences>();
    const { startsWith, prefix } = preferences;

    // Get the paths of all selected items and transform them
    const paths = selectedItems.map((item) => transformPath(item.path, startsWith, prefix));

    // If multiple files selected, join with newlines
    const pathString = paths.join("\n");

    await Clipboard.copy(pathString);

    const isUrl = startsWith && prefix;
    await showHUD(`Copied ${paths.length} ${isUrl ? "URL" : "path"}${paths.length > 1 ? "s" : ""} to clipboard`);
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Cannot copy file path",
      message: "Make sure Finder is the frontmost application with a file selected",
    });
  }
}
