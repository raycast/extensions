import { showToast, Toast } from "@raycast/api";
import { execa } from "execa";
import fs from "fs";
import path from "path";

async function replaceFolderIcon(directoryPath: string, iconPath: string) {
  // Check if the source icon file exists
  if (!fs.existsSync(iconPath)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "File Not Found",
      message: `Source icon file "${iconPath}" does not exist.`,
    });
    return;
  }

  try {
    // Create a temporary directory
    const tempDir = fs.mkdtempSync(path.join("/tmp", "icon_tmp_"));
    const icon = path.join(tempDir, "icon.png");
    const rsrc = path.join(tempDir, "icon.rsrc");

    // Ensure the temporary directory is removed when the process exits
    process.on("exit", () => fs.rmSync(tempDir, { recursive: true, force: true }));

    // Copy the source icon to the temporary directory and add metadata
    fs.copyFileSync(iconPath, icon);
    await execa("sips", ["-i", icon]);

    // Check if the destination folder exists
    if (!fs.existsSync(directoryPath) || !fs.lstatSync(directoryPath).isDirectory()) {
      throw new Error(`Destination "${directoryPath}" does not exist or is not a directory.`);
    }

    // If an old custom icon exists, remove it
    const oldIcon = path.join(directoryPath, "Icon\r");
    if (fs.existsSync(oldIcon)) {
      fs.unlinkSync(oldIcon);
    }

    // Refresh Finder view for the destination folder
    await execa("osascript", ["-e", `tell application "Finder" to update item POSIX file "${directoryPath}"`]);

    // Extract and apply the icon resource
    await execa("DeRez", ["-only", "icns", icon, ">", rsrc], { shell: true });
    await execa("SetFile", ["-a", "C", directoryPath]);
    fs.writeFileSync(oldIcon, "");
    await execa("Rez", ["-append", rsrc, "-o", oldIcon]);
    await execa("SetFile", ["-a", "V", oldIcon]);

    await showToast({
      style: Toast.Style.Success,
      title: "Change Folder Icon Successful",
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Change Folder Icon Failed",
      message: (error as Error).message || "An unexpected error occurred.",
    });
    console.error(error);
  }
}

export { replaceFolderIcon };
