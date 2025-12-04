import type { Tags } from "exifreader";
import ExifReader from "exifreader";
import fs from "node:fs/promises";

import { showActionToast, showFailureToast } from "./toast";

const handleError = (error: unknown) => {
  console.error(error);

  if (error instanceof Error) {
    showFailureToast("Failed to load EXIF data", error);
  }
};

export const exifFromFile = async (file: string): Promise<Tags | null> => {
  const toast = await showActionToast({ title: "Loading EXIF data...", cancelable: false });
  try {
    const filePath = decodeURIComponent(file).replace("file://", "");
    const buff = await fs.readFile(filePath);
    const tags = ExifReader.load(buff, { includeUnknown: true });
    toast.hide();
    return tags;
  } catch (error) {
    toast.hide();
    handleError(error);
    return null;
  }
};

export const exifFromUrl = async (url: string): Promise<Tags | null> => {
  try {
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      throw new Error("Invalid URL protocol");
    }
    const controller = await showActionToast({ title: "Loading EXIF data...", cancelable: true });
    const buff = await fetch(urlObj, { signal: controller.signal }).then((res) => res.arrayBuffer());
    const tags = ExifReader.load(buff, { includeUnknown: true });

    return tags;
  } catch (error) {
    handleError(error);
    return null;
  }
};
