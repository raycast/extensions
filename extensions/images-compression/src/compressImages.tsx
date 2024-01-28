import { showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { exec } from "child_process";
import { checkZipicInstallation } from "./utils/checkInstall";

export default async function main() {
  const isInstalled = await checkZipicInstallation();
  if (!isInstalled) {
    return;
  }

  let filePaths: string[];

  try {
    filePaths = (await getSelectedFinderItems()).map((f) => f.path);
    if (filePaths.length > 0) {
      const data = {
        urls: filePaths,
      };
      const url = `zipic://compress?data=${encodeURIComponent(JSON.stringify(data))}`;
      await showToast({
        style: Toast.Style.Success,
        title: "Compressing with CompressX",
      });
      exec(`open "${url}"`);
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Warning! No Finder items selected",
      });
    }
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: e instanceof Error ? e.message : "Could not get the selected Finder items",
    });
  }
}
