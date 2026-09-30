import { showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { exec } from "child_process";
import { checkCompressXInstallation } from "./utils/checkInstall";

export default async function main() {
  const isInstalled = await checkCompressXInstallation();
  if (!isInstalled) {
    return;
  }

  try {
    const filePaths = (await getSelectedFinderItems()).map((f) => f.path);
    const paths = filePaths.join("|");
    const url = `compresto://import?path=${paths}`;
    exec(`open "${url}"`);
    await showToast({
      style: Toast.Style.Success,
      title: "imported into Compresto",
    });
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: e instanceof Error ? e.message : "Could not get the selected Finder items",
    });
  }
}
