import { showToast, Toast, getSelectedFinderItems, open, showHUD } from "@raycast/api";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const execPromise = promisify(exec);

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length < 2) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please select at least 2 images in Finder",
      });
      return;
    }

    const imageFiles = selectedItems.filter((item) =>
      [".jpg", ".jpeg", ".png", ".gif"].includes(path.extname(item.path).toLowerCase()),
    );

    if (imageFiles.length < 2) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Please select at least 2 valid image files",
      });
      return;
    }

    await showHUD("Creating GIF...");

    const outputPath = path.join(os.homedir(), "Desktop", `output_${Date.now()}.gif`);

    // 构建 ImageMagick 命令
    const command = `PATH=/usr/local/bin:/opt/homebrew/bin:$PATH convert -delay 100 -loop 0 ${imageFiles.map((file) => `'${file.path}'`).join(" ")} '${outputPath}'`;

    console.log("Executing command:", command);

    // 执行命令
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error("Command stderr:", stderr);
    }

    console.log("Command stdout:", stdout);

    await showToast({
      style: Toast.Style.Success,
      title: "GIF Created",
      message: `Saved to ${outputPath}`,
    });

    await open(outputPath);
  } catch (error) {
    console.error("Detailed error:", error);
    let errorMessage = "An unknown error occurred";
    if (error instanceof Error) {
      errorMessage = `${error.name}: ${error.message}`;
      if (error.stack) {
        console.error("Error stack:", error.stack);
      }
    } else if (typeof error === "string") {
      errorMessage = error;
    }
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: errorMessage,
    });
  }
}
