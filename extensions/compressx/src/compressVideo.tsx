import { showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { exec } from "child_process";
import { checkCompressXInstallation } from "./utils/checkInstall";

export default async function main() {
  const isInstalled = await checkCompressXInstallation();
  if (!isInstalled) {
    return;
  }

  let filePaths: string[];

  try {
    filePaths = (await getSelectedFinderItems()).map((f) => f.path);
    for (const path of filePaths) {
      const url = `compressx://open?path=file://${path}`;
      exec(`open "${url}"`);
    }
    await showToast({
      style: Toast.Style.Success,
      title: "Compressing with CompressX",
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: e instanceof Error ? e.message : "Could not get the selected Finder items",
    });
  }
}
