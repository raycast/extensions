import { showToast, Toast } from "@raycast/api";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { File } from "../api/getFiles";
import { getOAuthToken } from "../api/googleAuth";

export const MIME_TYPE_LABELS: Record<string, string> = {
  "application/vnd.google-apps.document": "Google Docs",
  "application/vnd.google-apps.spreadsheet": "Google Sheets",
  "application/vnd.google-apps.presentation": "Google Slides",
  "application/vnd.google-apps.vid": "Google Vids",
  "application/vnd.google-apps.form": "Google Forms",
  "application/vnd.google-apps.drawing": "Google Drawings",
  "application/vnd.google-apps.map": "Google My Maps",
  "application/vnd.google-apps.site": "Google Sites",
  "application/vnd.google-apps.script": "Google Apps Script",
  "application/vnd.google-apps.folder": "Folder",
  "application/vnd.google-apps.shortcut": "Shortcut",
  "application/pdf": "PDF Document",
  "application/zip": "ZIP Archive",
  "application/x-zip-compressed": "ZIP Archive",
  "image/jpeg": "JPEG Image",
  "image/png": "PNG Image",
  "image/gif": "GIF Image",
  "text/plain": "Plain Text",
  "text/html": "HTML Document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Workbook",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PowerPoint Presentation",
};

export function getMimeTypeLabel(mimeType: string): string {
  return MIME_TYPE_LABELS[mimeType] || mimeType.split("/").pop() || "Unknown";
}

export function humanFileSize(size: number) {
  const unit = Math.floor(Math.log(size) / Math.log(1000));

  return `${Math.round(size / Math.pow(1000, unit))} ${["B", "kB", "MB", "GB", "TB"][unit]}`;
}

export function getFileIconLink(mimeType: string, size = 32) {
  return `https://drive-thirdparty.googleusercontent.com/${size}/type/${mimeType}`;
}

export async function downloadFile(file: File): Promise<void> {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Downloading...",
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
      title: "Downloading...",
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
            title: "Downloading...",
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
