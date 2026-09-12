import { execSync } from "child_process";
import * as crypto from "crypto";
import * as fs from "fs";
import * as https from "https";
import path from "path";

import { confirmAlert, environment, LocalStorage, showToast, Toast } from "@raycast/api";
import * as tar from "tar";

import runOperation from "./operations/runOperation";
import stripEXIF from "./operations/stripEXIFOperation";
import { ExifToolLocation } from "./utilities/enums";
import { getSelectedImages } from "./utilities/utils";

/**
 * Prompts the user to install ExifTool. If the user accepts, ExifTool is installed to the support directory.
 */
export async function installExifTool() {
  const oldVersionExists = fs.existsSync(`${environment.supportPath}/Image-ExifTool-12.74`);
  if (
    await confirmAlert({
      title: "Install ExifTool",
      message: oldVersionExists
        ? "A new version of ExifTool is required to strip EXIF data. Would you like to install it now?\n\nThis will use 30.2 MB of disk space."
        : "ExifTool is required to strip EXIF data. Would you like to install it now?",
      primaryAction: {
        title: "Install",
      },
    })
  ) {
    if (oldVersionExists) {
      const toast = await showToast({
        title: "Removing old version...",
        style: Toast.Style.Animated,
      });
      await fs.promises.rmdir(`${environment.supportPath}/Image-ExifTool-12.74`, { recursive: true });
      toast.title = "Old version removed";
      toast.style = Toast.Style.Success;
    }

    const toast = await showToast({
      title: "Installing ExifTool...",
      style: Toast.Style.Animated,
    });

    const supportPath = environment.supportPath;
    const tarURL = "https://exiftool.org/Image-ExifTool-13.21.tar.gz";
    const checksum = "c009024d0405ddc12fb448f0d3b2acc63ed5d87d55bf1f242522f22f0a03985c";

    let waiting = true;
    https.get(tarURL, async (response) => {
      const tarName = "Image-ExifTool-13.21.tar.gz";
      const tarPath = path.join(supportPath, tarName);
      const file = fs.createWriteStream(tarPath);
      response.pipe(file);

      // Checksum verification
      let valid = false;
      const hash = crypto.createHash("sha256");
      response.on("data", (data) => hash.update(data));
      response.on("end", async () => {
        const hex = hash.digest("hex");
        if (hex !== checksum) {
          toast.title = "Checksum verification failed";
          toast.style = Toast.Style.Failure;
          waiting = false;
          return;
        }
        valid = true;
      });

      file.on("finish", async () => {
        file.close();
        if (valid) {
          // Extract the tarball
          await tar.x({
            file: `${supportPath}/Image-ExifTool-13.21.tar.gz`,
            cwd: supportPath,
          });
          await fs.promises.rename(`${supportPath}/Image-ExifTool-13.21`, `${supportPath}/exiftool`);
          await LocalStorage.setItem("exifToolLocation", ExifToolLocation.SUPPORT_DIR);
          waiting = false;
          toast.title = "Done!";
          toast.style = Toast.Style.Success;
        }
        await fs.promises.unlink(tarPath);
      });
    });

    while (waiting) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } else {
    await LocalStorage.removeItem("exifToolLocation");
  }
}

/**
 * Determines whether ExifTool is on the path. If not, prompts the user to install it.
 */
export async function setExifToolLocation() {
  // See if ExifTool is on the path
  try {
    execSync("exiftool -ver");
    await LocalStorage.setItem("exifToolLocation", ExifToolLocation.ON_PATH);
  } catch {
    // If not, prompt the user to install it
    await installExifTool();
  }
}

/**
 * Gets the location of ExifTool, either on the path or in the support directory.
 * @returns The location of ExifTool, either on the path or in the support directory.
 */
export async function getExifToolLocation() {
  const initialLocation = await LocalStorage.getItem("exifToolLocation");
  if (
    initialLocation !== ExifToolLocation.ON_PATH &&
    (initialLocation !== ExifToolLocation.SUPPORT_DIR || !fs.existsSync(`${environment.supportPath}/exiftool/exiftool`))
  ) {
    if (fs.existsSync(`${environment.supportPath}/exiftool/exiftool`)) {
      await LocalStorage.setItem("exifToolLocation", ExifToolLocation.SUPPORT_DIR);
    } else {
      await setExifToolLocation();
    }
  }

  if (initialLocation === ExifToolLocation.ON_PATH) {
    try {
      execSync("exiftool -ver");
      return ExifToolLocation.ON_PATH;
    } catch {
      await setExifToolLocation();
    }
  }

  return await LocalStorage.getItem("exifToolLocation");
}

export default async function Command() {
  const selectedImages = await getSelectedImages();
  const exifToolLocation = await getExifToolLocation();
  if (!exifToolLocation) {
    await showToast({
      title: "Command Cancelled",
      message: "ExifTool is required to strip EXIF data.",
      style: Toast.Style.Failure,
    });
    return;
  }

  await runOperation({
    operation: () => stripEXIF(selectedImages, exifToolLocation as ExifToolLocation),
    selectedImages,
    inProgressMessage: "Sanitizing...",
    successMessage: "Sanitized",
    failureMessage: "Failed to sanitize",
  });
}
