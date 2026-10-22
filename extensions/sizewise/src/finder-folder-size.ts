import { showHUD, showToast, Toast } from "@raycast/api";
import { finderFolder } from "./finder";
import { measureFolder, sizeSentence } from "./folder-size";
import { folderName } from "./paths";
import { showScanFailure } from "./sizewise";

export default async function Command() {
  try {
    const path = await finderFolder();
    const name = folderName(path);
    await showToast({ style: Toast.Style.Animated, title: `Measuring ${name}…` });
    await showHUD(sizeSentence(name, await measureFolder(path)));
  } catch (error) {
    await showScanFailure(error, "Couldn't measure the folder");
  }
}
