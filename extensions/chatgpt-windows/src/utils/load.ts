import { Clipboard } from "@raycast/api";
import { execFile } from "child_process";
import fs from "fs/promises";
import { imageMeta } from "image-meta";
import path from "path";
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
  const selectedImages = await getExplorerSelectedImages();
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
  $selected -join "`n"
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
