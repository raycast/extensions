import fetch from "node-fetch";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { showInFinder, showToast, Toast } from "@raycast/api";

export const downloadFile = async (url: string, filename: string) => {
  const path = join(homedir(), "Downloads", `${filename}.gif`);

  try {
    const toast = await showToast(Toast.Style.Animated, "Downloading Slackmoji", "Please wait...");
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();

    await writeFile(path, Buffer.from(arrayBuffer));

    toast.title = "Downloaded";
    toast.message = `${path}`;
    toast.style = Toast.Style.Success;

    await showInFinder(path);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Download failed", "Please try again");
  }
};
