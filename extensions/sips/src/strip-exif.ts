import { execSync } from "child_process";
import * as https from "https";
import * as tar from "tar";
import * as fs from "fs";
import * as crypto from "crypto";

import { confirmAlert, environment, LocalStorage, showToast, Toast } from "@raycast/api";

import runOperation from "./operations/runOperation";
import stripEXIF from "./operations/stripEXIFOperation";
import { ExifToolLocation } from "./utilities/enums";
import { getSelectedImages } from "./utilities/utils";
import path from "path";

/**
 * Prompts the user to install ExifTool. If the user accepts, ExifTool is installed to the support directory.
 */
async function installExifTool() {
  if (
    await confirmAlert({
      title: "Install ExifTool",
      message:
        "ExifTool is required to strip EXIF data. Would you like to install it now?\n\nThis will use 26.2 MB of disk space.",
      primaryAction: {
        title: "Install",
      },
    })
  ) {
    const toast = await showToast({
      title: "Installing ExifTool...",
      style: Toast.Style.Animated,
    });

    const supportPath = environment.supportPath;
    const tarURL = "https://exiftool.org/Image-ExifTool-12.74.tar.gz";
    const checksum = "aedb28b1427c53205ab261fa31ff3feda73e7f17a0c181453651680e5666c48a";

    let waiting = true;
    https.get(tarURL, async (response) => {
      const tarName = "Image-ExifTool-12.74.tar.gz";
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
          await tar.x({ file: `${supportPath}/Image-ExifTool-12.74.tar.gz`, cwd: supportPath });
          await LocalStorage.setItem("exifToolLocation", ExifToolLocation.SUPPORT_DIR);
          waiting = false;
        }
        await fs.promises.unlink(tarPath);
        toast.title = "Done!";
        toast.style = Toast.Style.Success;
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
async function setExifToolLocation() {
  // See if ExifTool is on the path
  try {
    execSync("exiftool -ver");
    await LocalStorage.setItem("exifToolLocation", ExifToolLocation.ON_PATH);
  } catch (error) {
    // If not, prompt the user to install it
    await installExifTool();
  }
}

/**
 * Gets the location of ExifTool, either on the path or in the support directory.
 * @returns The location of ExifTool, either on the path or in the support directory.
 */
async function getExifToolLocation() {
  const initialLocation = await LocalStorage.getItem("exifToolLocation");
  if (
    initialLocation !== ExifToolLocation.ON_PATH &&
    (initialLocation !== ExifToolLocation.SUPPORT_DIR ||
      !fs.existsSync(`${environment.supportPath}/Image-ExifTool-12.74/exiftool`))
  ) {
    await setExifToolLocation();
  }

  if (initialLocation === ExifToolLocation.ON_PATH) {
    try {
      execSync("exiftool -ver");
      return ExifToolLocation.ON_PATH;
    } catch (error) {
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
