import fs from "fs";
import path from "path";
import { homedir } from "os";
import { showToast, Toast } from "@raycast/api";
import axios from "axios";

export async function downloadFile(url: string, filename: string): Promise<string> {
  const downloadsPath = path.join(homedir(), "Downloads");
  const filepath = path.join(downloadsPath, filename);

  await showToast({
    style: Toast.Style.Animated,
    title: "Downloading",
    message: `Downloading ${filename}...`,
  });

  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "arraybuffer",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.data) {
      throw new Error("No data received from server");
    }

    await fs.promises.writeFile(filepath, response.data);

    await showToast({
      style: Toast.Style.Success,
      title: "Download Complete",
      message: `Saved to Downloads folder`,
    });

    return filepath;
  } catch (error) {
    let errorMessage = "Unknown error occurred";

    if (axios.isAxiosError(error)) {
      if (error.response) {
        errorMessage = `Server error: ${error.response.status} ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = "No response received from server";
      } else {
        errorMessage = `Network error: ${error.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    await showToast({
      style: Toast.Style.Failure,
      title: "Download Failed",
      message: errorMessage,
    });

    return "";
  }
}
