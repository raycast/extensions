import { showToast, Toast } from "@raycast/api";
import { resolveMime } from "friendly-mimes";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { File } from "../api/getFiles";
import { getOAuthToken } from "../api/googleAuth";

export function getMimeTypeLabel(mimeType: string): string {
  try {
    const result = resolveMime(mimeType);
    if (result?.name) {
      return result.name;
    }
  } catch {
    // If friendly-mimes doesn't recognize the MIME type, continue to fallback
  }

  // Fallback to extracting from MIME type
  return mimeType.split("/").pop() || "Unknown";
}

export function humanFileSize(size: number) {
  const unit = Math.floor(Math.log(size) / Math.log(1000));

  return `${Math.round(size / Math.pow(1000, unit))} ${["B", "KB", "MB", "GB", "TB"][unit]}`;
}

export function getFileIconLink(mimeType: string, size = 32) {
  return `https://drive-thirdparty.googleusercontent.com/${size}/type/${mimeType}`;
}

export async function downloadFile(file: File): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Downloading…",
      message: file.name,
    });

    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;

    const response = await fetch(downloadUrl, {
      headers: {
        Authorization: `Bearer ${getOAuthToken()}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const contentLength = response.headers.get("content-length");
    const totalBytes = contentLength ? parseInt(contentLength, 10) : file.size ? parseInt(file.size) : 0;

    const downloadsPath = join(homedir(), "Downloads");
    const filePath = join(downloadsPath, file.name);

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let downloadedBytes = 0;
    let done = false;
    let lastUpdateTime = Date.now();

    await showToast({
      style: Toast.Style.Animated,
      title: "Downloading…",
      message: totalBytes > 0 ? `0% - ${file.name}` : file.name,
    });

    while (!done) {
      const { done: readerDone, value } = await reader.read();
      done = readerDone;

      if (value) {
        chunks.push(value);
        downloadedBytes += value.length;

        const now = Date.now();
        if (totalBytes > 0 && now - lastUpdateTime > 500) {
          const percentage = Math.round((downloadedBytes / totalBytes) * 100);
          const downloadedMB = (downloadedBytes / (1024 * 1024)).toFixed(2);
          const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
          await showToast({
            style: Toast.Style.Animated,
            title: "Downloading…",
            message: `${percentage}% - ${downloadedMB} MB / ${totalMB} MB`,
          });
          lastUpdateTime = now;
        }
      }
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    await writeFile(filePath, buffer);

    await showToast({
      style: Toast.Style.Success,
      title: "Downloaded",
      message: file.name,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Download failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
