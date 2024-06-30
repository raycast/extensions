import { Clipboard, confirmAlert, getDefaultApplication, getSelectedFinderItems, open } from "@raycast/api";
import { YoinkAppStoreLink, YoinkBundleIdentifier, YoinkPath } from "./constants";

export async function checkYoink() {
  // check if Yoink is installed
  try {
    await getDefaultApplication(YoinkPath);
    return true;
  } catch (e) {
    console.error(e);
  }
  await confirmAlert({
    icon: "yoink-icon.png",
    title: "Yoink is not installed",
    message: "Please install Yoink from the App Store.",
    primaryAction: {
      title: "Open App Store",
      onAction: async () => {
        await open(YoinkAppStoreLink);
      },
    },
  });
  return false;
}

export async function addFromFinder() {
  try {
    const selectedItems = await getSelectedFinderItems();
    if (selectedItems.length > 0) {
      // add from finder
      for (const item of selectedItems) {
        await open(item.path, YoinkBundleIdentifier);
      }
      return true;
    }
  } catch (e) {
    console.error(e);
  }
  return false;
}

export async function addFromClipboard() {
  try {
    // add from clipboard
    const { file } = await Clipboard.read();
    if (file) {
      await open(file, YoinkBundleIdentifier);
      return true;
    }
  } catch (e) {
    console.error(e);
  }
  return false;
}
