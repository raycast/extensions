import { open, showInFinder, showToast, Toast } from "@raycast/api";
import { execFile } from "child_process";
import { resolveMime } from "friendly-mimes";
import { mkdir, mkdtemp, open as openFile, rm } from "fs/promises";
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
  "application/vnd.google-apps.drawing": [{ title: "PNG", extension: "png", mimeType: "image/png" }],
};

export type DownloadOption = { title: string; format?: ExportFormat };

export function getDownloadOptions(file: Pick<File, "mimeType">): DownloadOption[] {
  if (file.mimeType === FOLDER_MIME_TYPE) return [{ title: "Download as ZIP" }];
  if (EXPORT_FORMATS[file.mimeType]) {
    return EXPORT_FORMATS[file.mimeType].map((format) => ({ title: `Download as ${format.title}`, format }));
  }
  // Other Google-native files (forms, sites, shortcuts…) can't be exported
  return file.mimeType.startsWith("application/vnd.google-apps.") ? [] : [{ title: "Download File" }];
}

type DriveItem = Pick<File, "id" | "name" | "mimeType">;

// Calls `create` with "name", "name (1)", "name (2)"… until it succeeds, so the path is reserved atomically
async function createUnique<T>(
  dir: string,
  name: string,
  extension: string | undefined,
  create: (path: string) => Promise<T>,
): Promise<[string, T]> {
  let { name: base, ext } = parse(name.replace(/[/\\:]/g, "_"));
  if (extension) {
    base = ext.toLowerCase() === `.${extension}` ? base : base + ext;
    ext = `.${extension}`;
  }

  for (let i = 0; ; i++) {
    const path = join(dir, `${base}${i > 0 ? ` (${i})` : ""}${ext}`);
    try {
      return [path, await create(path)];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
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
  const [filePath, handle] = await createUnique(dir, item.name, format?.extension, (path) => openFile(path, "wx"));

  let downloadedBytes = 0;
  try {
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
      handle.createWriteStream(),
    );
  } catch (error) {
    // Only this call created the file, so removing it can't affect another download
    await rm(filePath, { force: true });
    throw error;
  }

  return filePath;
}

// Files that can't be exported are skipped and their names are collected in `skipped`
async function downloadFolderToDir(
  folder: DriveItem,
  dir: string,
  onProgress: OnProgress,
  skipped: string[],
): Promise<string> {
  const [folderPath] = await createUnique(dir, folder.name, undefined, (path) => mkdir(path));

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
        await downloadFolderToDir(item, folderPath, onProgress, skipped);
        continue;
      }

      const options = getDownloadOptions(item);
      if (options.length > 0) {
        await downloadToDir(item, folderPath, onProgress, options[options.length - 1].format);
      } else {
        skipped.push(item.name);
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return folderPath;
}

async function downloadFolderAsZip(folder: DriveItem, onProgress: OnProgress): Promise<Download> {
  const tempDir = await mkdtemp(join(tmpdir(), "google-drive-"));
  try {
    const skipped: string[] = [];
    const folderPath = await downloadFolderToDir(folder, tempDir, onProgress, skipped);
    const [zipPath, handle] = await createUnique(getDownloadsPath(), folder.name, "zip", (path) =>
      openFile(path, "wx"),
    );
    await handle.close();

    onProgress(`Compressing ${folder.name}`);
    try {
      // bsdtar ships with both macOS and Windows and picks the zip format from the extension
      await promisify(execFile)("tar", ["-a", "-cf", zipPath, "-C", tempDir, basename(folderPath)]);
    } catch (error) {
      await rm(zipPath, { force: true });
      throw error;
    }

    return { path: zipPath, skipped };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function getDownloadsPath() {
  return join(homedir(), "Downloads");
}

export type Download = {
  path: string;
  // Names of files inside a folder that couldn't be exported (forms, sites…)
  skipped: string[];
};

// Downloads to the Downloads folder
export async function downloadToDownloads(
  file: DriveItem,
  format?: ExportFormat,
  onProgress: OnProgress = () => {},
): Promise<Download> {
  return file.mimeType === FOLDER_MIME_TYPE
    ? downloadFolderAsZip(file, onProgress)
    : { path: await downloadToDir(file, getDownloadsPath(), onProgress, format), skipped: [] };
}

export async function downloadFile(file: File, format?: ExportFormat): Promise<void> {
  const toast = await showToast({ style: Toast.Style.Animated, title: "Downloading…", message: file.name });

  try {
    const { path, skipped } = await downloadToDownloads(file, format, (message) => (toast.message = message));

    toast.style = Toast.Style.Success;
    toast.title = skipped.length > 0 ? `Downloaded, ${skipped.length} file(s) couldn't be exported` : "Downloaded";
    toast.message = skipped.length > 0 ? `${basename(path)} - skipped: ${skipped.join(", ")}` : basename(path);
    toast.primaryAction = { title: "Open File", onAction: () => open(path) };
    toast.secondaryAction = { title: "Show in Folder", onAction: () => showInFinder(path) };
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
  }
}
