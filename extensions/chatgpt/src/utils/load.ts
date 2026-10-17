import { Clipboard } from "@raycast/api";
import { execFile } from "child_process";
import fs from "fs/promises";
import { imageMeta } from "image-meta";
import path from "path";
import { runAppleScript } from "run-applescript";
import util from "node:util";

type ImageMeta = {
  type: string;
  height: number;
  width: number;
};

export type LoadFrom = { data: Buffer; type: ImageMeta };

const execFileAsync = util.promisify(execFile);

const getType = async (data: Buffer, image: string): Promise<ImageMeta> => {
  const meta = await imageMeta(data);
  const type = meta.type ?? (path.extname(image).slice(1) || "png");
  const height = meta.height ?? 0;
  const width = meta.width ?? 0;
  return { type, height, width };
};

export const loadFromFinder = async (): Promise<LoadFrom | undefined> => {
  const selectedImages = await getSelectedImages();
  if (!selectedImages?.length) {
    return;
  }

  const image = selectedImages[0];
  const data = await fs.readFile(image);
  const type = await getType(data, image);

  return { data, type };
};

export const loadFromClipboard = async () => {
  let { file: image } = await Clipboard.read();
  if (!image) {
    return;
  }

  image = decodeURIComponent(image);

  if (image.startsWith("file://")) {
    image = image.slice(7);
  }

  const data = await fs.readFile(image);
  const type = await getType(data, image);

  return { data, type };
};

const getSelectedImages = async (): Promise<string[]> => {
  if (process.platform === "win32") {
    return getExplorerSelectedImages();
  }
  return getFinderSelectedImages();
};

/**
 * Gets currently selected images in Finder (macOS).
 *
 * @returns A promise resolving to the comma-separated list of images as a string.
 */
const getFinderSelectedImages = async (): Promise<string[]> => {
  const result = await runAppleScript(
    `\
set imageTypes to {"PNG", "JPG", "JPEG", "TIF", "HEIF", "GIF", "ICO", "ICNS", "ASTC", "BMP", "DDS", "EXR", "JP2", "KTX", "Portable Bitmap", "Adobe Photoshop", "PVR", "TGA", "WebP", "SVG", "PDF", "HEIC"}

tell application "Finder"
  set theSelection to selection
  if theSelection is {} then
    return
  else if (theSelection count) is equal to 1 then
    repeat with imageType in imageTypes
      if (kind of the first item of theSelection) contains imageType then
        return the POSIX path of (theSelection as alias)
        exit repeat
      end if
    end repeat
  else
    set thePaths to {}
    repeat with i from 1 to (theSelection count)
      repeat with imageType in imageTypes
        if (kind of (item i of theSelection)) contains imageType then
          copy (POSIX path of (item i of theSelection as alias)) to end of thePaths
          exit repeat
        end if
      end repeat
    end repeat
    return thePaths
  end if
end tell`,
  );
  return result.split(/,\s+/g).filter((item) => !!item);
};

/**
 * Gets currently selected images in Windows Explorer.
 * Falls back to an empty array if no selection or an error occurs.
 */
const getExplorerSelectedImages = async (): Promise<string[]> => {
  if (process.platform !== "win32") {
    return [];
  }

  const psScript = `
  $shell = New-Object -ComObject Shell.Application
  $selected = @()
  foreach ($window in $shell.Windows()) {
    try {
      $doc = $window.Document
      if ($doc -and $doc.SelectedItems()) {
        foreach ($item in $doc.SelectedItems()) {
          $selected += $item.Path
        }
      }
    } catch {}
  }
  $selected -join [Environment]::NewLine
  `;

  try {
    const { stdout } = await execFileAsync("powershell", ["-NoProfile", "-Command", psScript], {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => !!item);
  } catch (error) {
    console.error("Failed to read selection from Explorer", error);
    return [];
  }
};
