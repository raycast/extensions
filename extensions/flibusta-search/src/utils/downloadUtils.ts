// src/utils/downloadUtils.ts
import fs from "fs";
import path from "path";
import { homedir } from "os";
import { showToast, Toast } from "@raycast/api";
import axios from "axios";

export async function downloadFile(url: string, filename: string): Promise<string> {
  try {
    const downloadsPath = path.join(homedir(), "Downloads");
    const filepath = path.join(downloadsPath, filename);

    // Show download starting toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Downloading",
      message: `Downloading ${filename}...`,
    });

    // Fetch the file
    const response = await axios(url);
    // Check if the response is a stream
    if (!response.data || !response.data.pipe) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Download Failed",
        message: "Response is not a stream",
      });
    }

    // Get the buffer
    const buffer = await response.data;

    // Write to file
    fs.writeFileSync(filepath, buffer);

    // Success notification
    await showToast({
      style: Toast.Style.Success,
      title: "Download Complete",
      message: `Saved to Downloads folder`,
    });

    return filepath;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Download Failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}
