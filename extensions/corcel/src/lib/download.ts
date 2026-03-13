import { join } from "path";
import { homedir } from "os";
import fetch from "node-fetch";
import { writeFile } from "fs/promises";

import { Toast, getPreferenceValues, showToast } from "@raycast/api";

export const downloadMedia = async (url: string, filename: string) => {
  const preferences = getPreferenceValues<Preferences>();

  const path = join(
    preferences.imageDownloadFolder || homedir() + "/Downloads",
    `${filename.toLowerCase().split(" ").join("-")}.webp`,
  );

  try {
    await showToast(Toast.Style.Animated, "Downloading image", "Please wait...");
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    await writeFile(path, Buffer.from(buffer));
    await showToast(Toast.Style.Success, "Image Downloaded!", path);
  } catch (_) {
    await showToast(Toast.Style.Failure, "Download failed", "Please try again");
  }
};
