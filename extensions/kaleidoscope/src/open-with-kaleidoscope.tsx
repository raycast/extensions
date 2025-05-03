import { showToast, Toast, getSelectedFinderItems, closeMainWindow } from "@raycast/api";
import { exec } from "child_process";
import { checkKaleidoscopeInstallation } from "./utils/checkInstall";

export default async function main() {
  const application = await checkKaleidoscopeInstallation();
  if (!application) {
    return;
  }

  try {
    const filePaths = (await getSelectedFinderItems()).map((f) => f.path);
    if (filePaths.length >= 2) {
      const file1 = filePaths[0];
      const file2 = filePaths[1];

      console.log(file1);
      await showToast({
        style: Toast.Style.Success,
        title: "Opening Kaleidoscope",
        message: `Comparing ${file1} and ${file2}`,
      });

      const kalPath = application.path;
      const command = `"${kalPath}/Contents/MacOS/ksdiff" "${file1}" "${file2}"`;

      exec(command);
      closeMainWindow({ clearRootSearch: true });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please select at least two files",
        message: "Please select at least two files",
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
