import { open, showInFinder, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { resolveMime } from "friendly-mimes";
import { createWriteStream, existsSync } from "fs";
import { mkdir, mkdtemp, rm } from "fs/promises";
import { homedir, tmpdir } from "os";
import { basename, join, parse } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { ReadableStream as WebReadableStream } from "stream/web";
import { promisify } from "util";
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

export type ExportFormat = { title: string; extension: string; mimeType: string };

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";

// Google-native files can't be downloaded as is, they need to be exported
// When downloading a folder, the last format is used
const EXPORT_FORMATS: Record<string, ExportFormat[]> = {
  "application/vnd.google-apps.document": [
    { title: "Markdown", extension: "md", mimeType: "text/markdown" },
    {
      title: "Word",
      extension: "docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    },
  ],
  "application/vnd.google-apps.spreadsheet": [
    {
      title: "Excel",
      extension: "xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  ],
  "application/vnd.google-apps.presentation": [
    {
      title: "PowerPoint",
      extension: "pptx",
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    },
  ],
};

export type DownloadOption = { title: string; format?: ExportFormat };

export function getDownloadOptions(file: Pick<File, "mimeType">): DownloadOption[] {
  if (file.mimeType === FOLDER_MIME_TYPE) return [{ title: "Download as ZIP" }];
  if (EXPORT_FORMATS[file.mimeType]) {
    return EXPORT_FORMATS[file.mimeType].map((format) => ({ title: `Download as ${format.title}`, format }));
  }
  // Other Google-native files (forms, sites, shortcuts…) can't be downloaded
  return file.mimeType.startsWith("application/vnd.google-apps.") ? [] : [{ title: "Download File" }];
}

type DriveItem = Pick<File, "id" | "name" | "mimeType">;

// Returns a path in `dir` that doesn't exist yet, e.g. "Report (1).pdf"
function getAvailablePath(dir: string, name: string, extension?: string) {
  let { name: base, ext } = parse(name.replace(/[/\\:]/g, "_"));
  if (extension) {
    base = ext.toLowerCase() === `.${extension}` ? base : base + ext;
    ext = `.${extension}`;
  }

  let path = join(dir, base + ext);
  for (let i = 1; existsSync(path); i++) {
    path = join(dir, `${base} (${i})${ext}`);
  }
  return path;
}

async function fetchDrive(path: string) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files${path}`, {
    headers: { Authorization: `Bearer ${getOAuthToken()}` },
  });

  if (!response.ok || !response.body) {
    const data = (await response.json().catch(() => undefined)) as { error?: { message?: string } } | undefined;
    throw new Error(data?.error?.message ?? `Download failed: ${response.statusText}`);
  }

  return response;
}

type OnProgress = (message: string) => void;

async function downloadToDir(
  item: DriveItem,
  dir: string,
  onProgress: OnProgress,
  format?: ExportFormat,
): Promise<string> {
  const response = await fetchDrive(
    format
      ? `/${item.id}/export?mimeType=${encodeURIComponent(format.mimeType)}`
      : `/${item.id}?alt=media&supportsAllDrives=true`,
  );
  const totalBytes = parseInt(response.headers.get("content-length") ?? "0", 10);
  const filePath = getAvailablePath(dir, item.name, format?.extension);

  let downloadedBytes = 0;
  await pipeline(
    Readable.fromWeb(response.body as WebReadableStream),
    async function* (source) {
      for await (const chunk of source) {
        downloadedBytes += chunk.length;
        onProgress(
          totalBytes
            ? `${Math.round((downloadedBytes / totalBytes) * 100)}% - ${item.name}`
            : `${humanFileSize(downloadedBytes)} - ${item.name}`,
        );
        yield chunk;
      }
    },
    createWriteStream(filePath),
  );

  return filePath;
}

async function downloadFolderToDir(folder: DriveItem, dir: string, onProgress: OnProgress): Promise<string> {
  const folderPath = getAvailablePath(dir, folder.name);
  await mkdir(folderPath);

  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${folder.id}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: "1000",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      ...(pageToken && { pageToken }),
    });
    const response = await fetchDrive(`?${params}`);
    const data = (await response.json()) as { nextPageToken?: string; files: DriveItem[] };

    for (const item of data.files) {
      if (item.mimeType === FOLDER_MIME_TYPE) {
        await downloadFolderToDir(item, folderPath, onProgress);
        continue;
      }

      const options = getDownloadOptions(item);
      if (options.length > 0) {
        await downloadToDir(item, folderPath, onProgress, options[options.length - 1].format);
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return folderPath;
}

async function downloadFolderAsZip(folder: DriveItem, onProgress: OnProgress): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), "google-drive-"));
  try {
    const folderPath = await downloadFolderToDir(folder, tempDir, onProgress);
    const zipPath = getAvailablePath(getDownloadsPath(), folder.name, "zip");

    onProgress(`Compressing ${folder.name}`);
    // bsdtar ships with both macOS and Windows and picks the zip format from the extension
    await promisify(execFile)("tar", ["-a", "-cf", zipPath, "-C", tempDir, basename(folderPath)]);

    return zipPath;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function getDownloadsPath() {
  return join(homedir(), "Downloads");
}

// Downloads to the Downloads folder and returns the path of the downloaded file
export function downloadToDownloads(file: DriveItem, format?: ExportFormat, onProgress: OnProgress = () => {}) {
  return file.mimeType === FOLDER_MIME_TYPE
    ? downloadFolderAsZip(file, onProgress)
    : downloadToDir(file, getDownloadsPath(), onProgress, format);
}

export async function downloadFile(file: File, format?: ExportFormat): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading…", message: file.name });

  try {
    const filePath = await downloadToDownloads(file, format, (message) => (toast.message = message));

    toast.style = Toast.Style.Success;
    toast.title = "Downloaded";
    toast.message = basename(filePath);
    toast.primaryAction = { title: "Open File", onAction: () => open(filePath) };
    toast.secondaryAction = { title: "Show in Folder", onAction: () => showInFinder(filePath) };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
