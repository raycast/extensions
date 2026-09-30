import fs from "fs";
import path from "path";
import { promisify } from "util";
import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

const rename = promisify(fs.rename);
const mkdir = promisify(fs.mkdir);
const access = promisify(fs.access);

/**
 * Moves a file from source to destination directory.
 * Creates the destination directory if it doesn't exist.
 */
export async function moveFile(sourcePath: string, destDir: string): Promise<string> {
  try {
    try {
      await access(destDir, fs.constants.W_OK);
    } catch {
      await mkdir(destDir, { recursive: true });
      await showToast(Toast.Style.Success, "Created directory", destDir);
    }

    const fileName = path.basename(sourcePath);
    const destinationPath = path.join(destDir, fileName);

    // Check if a file with the same name already exists in the destination
    try {
      await access(destinationPath);
      // File exists, create a unique name
      const { name, ext } = path.parse(fileName);
      const uniqueName = `${name}_${Date.now()}${ext}`;
      const uniqueDestinationPath = path.join(destDir, uniqueName);

      await rename(sourcePath, uniqueDestinationPath);
      await showToast(
        Toast.Style.Success,
        "File moved with unique name",
        `Renamed to ${uniqueName} to avoid overwriting`,
      );

      return uniqueDestinationPath;
    } catch {
      // File doesn't exist, proceed with normal move
      await rename(sourcePath, destinationPath);
      return destinationPath;
    }
  } catch (error) {
    console.error("Error moving file:", error);
    await showFailureToast(error, { title: "Failed to move file" });
    throw error;
  }
}
