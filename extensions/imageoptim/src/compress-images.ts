import { showToast, Toast, getSelectedFinderItems } from "@raycast/api";
import { exec } from "child_process";
import { checkImageOptimInstallation } from "./utils/check-install";

export default async function main() {
  console.log("Starting image compression process");

  if (!(await checkImageOptimInstallation())) {
    console.log("ImageOptim is not installed. Exiting.");
    return;
  }

  const filePaths = (await getSelectedFinderItems()).map((f) => f.path);
  console.log(`Selected file paths: ${filePaths.join(", ")}`);

  if (filePaths.length === 0) {
    console.log("No Finder items selected");
    await showToast({
      style: Toast.Style.Failure,
      title: "No Finder items selected",
    });
    return;
  }

  console.log("Showing compression start toast");
  await showToast({
    style: Toast.Style.Animated,
    title: "Compressing with ImageOptim",
  });

  const escapedPaths = filePaths.map((path) => `"${path.replace(/"/g, '\\"')}"`).join(" ");
  console.log(`Executing ImageOptim with paths: ${escapedPaths}`);

  try {
    console.log("Starting ImageOptim process");
    await new Promise((resolve, reject) => {
      const process = exec(`/Applications/ImageOptim.app/Contents/MacOS/ImageOptim ${escapedPaths}`, {
        shell: true,
        timeout: 300000, // 5 minutes timeout
      });

      process.on("exit", (code) => {
        if (code === 0) {
          console.log("ImageOptim process completed successfully");
          resolve(null);
        } else {
          reject(new Error(`ImageOptim process exited with code ${code}`));
        }
      });

      process.on("error", (error) => {
        reject(error);
      });
    });

    console.log("Compression completed successfully");
    await showToast({
      style: Toast.Style.Success,
      title: "Compression Complete",
      message: "Images have been optimized",
    });
  } catch (error) {
    console.error("Compression failed:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Compression Failed",
      message: "An error occurred during compression",
    });
  }
}
