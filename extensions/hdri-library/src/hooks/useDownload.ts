import { showToast, Toast, Clipboard } from "@raycast/api";
import path from "path";
import os from "os";
import fs from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { useSettings } from "./useSettings";

export function useDownload() {
  const { settings } = useSettings();

  const downloadFile = async (url: string, fileName: string, onComplete?: (path: string) => void) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Downloading...",
      message: fileName,
    });

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch ${url}`);
      if (!response.body) throw new Error("No response body");

      let downloadDir = settings.downloadDirectory;

      // Handle tilde expansion and relative paths
      if (!downloadDir || downloadDir.startsWith("~")) {
        const homeDir = os.homedir();
        const relativePath = downloadDir ? downloadDir.replace(/^~/, "") : "";

        // Use platform-appropriate default Downloads folder
        if (!relativePath || relativePath === "/" || relativePath === "\\") {
          // Try to find the actual Downloads folder
          const platform = process.platform;
          if (platform === "win32") {
            // On Windows, try common Downloads locations
            const userProfile = process.env.USERPROFILE || homeDir;
            downloadDir = path.join(userProfile, "Downloads");
          } else {
            // On macOS/Linux, use ~/Downloads
            downloadDir = path.join(homeDir, "Downloads");
          }
        } else {
          // Expand relative path from home directory
          downloadDir = path.join(homeDir, relativePath.replace(/^[/\\]/, ""));
        }
      }

      // Normalize the path for cross-platform compatibility
      downloadDir = path.normalize(downloadDir);

      // Ensure the download directory exists
      if (!fs.existsSync(downloadDir)) {
        fs.mkdirSync(downloadDir, { recursive: true });
      }

      const destPath = path.join(downloadDir, fileName);
      const fileStream = fs.createWriteStream(destPath);
      // Cast: fetch() returns a Web API ReadableStream; Node's Readable.fromWeb accepts the stream/web type
      const nodeReadable = Readable.fromWeb(response.body as import("stream/web").ReadableStream<Uint8Array>);
      await pipeline(nodeReadable, fileStream);

      await Clipboard.copy(destPath);
      if (onComplete) onComplete(destPath);

      toast.style = Toast.Style.Success;
      toast.title = "Download Complete";
      toast.message = "Path copied to clipboard";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Download Failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  };

  return { downloadFile };
}
