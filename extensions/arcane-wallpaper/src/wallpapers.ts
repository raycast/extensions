import { ArcaneWallpaper } from "./types/types";

const ARCANE_DRIVE_FOLDER_ID = "1Gi8i-TiJAjbqEIMiGOzD_E4RK4po0Lhk";
const GOOGLE_DRIVE_FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
const IMAGE_FILE_PATTERN = /\.(png|jpe?g|webp)$/i;

type SelectedDriveFolder = {
  id: string;
  title: string;
};

const selectedDriveFolders: SelectedDriveFolder[] = [
  { id: "1zLCJfyD-CazgD6cw9KtPe6_q6rHJv21h", title: "Enemy Music Video" },
  { id: "1TXLKvmnQZxZNBRcKWM0zlEVHvjOjtkTA", title: "Ma meilleure ennemie Music Video" },
  { id: "1FnrRP2RCH6TBntFZcMySUGZTDAwiq3M3", title: "Opening Credits / Season 1" },
  { id: "1KyN-UCpkY9fmifmvsTbqCDEQmQ-okuHK", title: "Opening Credits / Season 2" },
  { id: "1DUTH7G5pLoD5SsFWvvGVefrA9M_kPYs0", title: "Twilight's End" },
  { id: "1pzqEzn7-Ii1B5vLsRRGfJpWF5EttXKs4", title: "Welcome to Noxus Trailer" },
];

let lastDriveLoadWarning: string | undefined;

type DriveEntry = {
  id: string;
  title: string;
  href: string;
  thumbnailUrl?: string;
  isFolder: boolean;
};

const decodeHtml = (value: string) =>
  value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const driveFolderUrl = (folderId: string) => `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
const driveDownloadUrl = (fileId: string) => `https://drive.google.com/uc?export=download&id=${fileId}`;
const driveThumbnailUrl = (fileId: string) => `https://drive.google.com/thumbnail?id=${fileId}&sz=w500`;

const getDriveId = (href: string) => {
  const folderMatch = href.match(/\/folders\/([A-Za-z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  const fileMatch = href.match(/\/file\/d\/([A-Za-z0-9_-]+)/);
  return fileMatch?.[1];
};

const parseDriveEntries = (html: string): DriveEntry[] => {
  const entries: DriveEntry[] = [];

  for (const entryPart of html.split('<div class="flip-entry"').slice(1)) {
    const entryHtml = `<div class="flip-entry"${entryPart}`;
    const href = decodeHtml(entryHtml.match(/<a href="([^"]+)"/)?.[1] ?? "");
    const id = getDriveId(href) ?? entryHtml.match(/id="entry-([^"]+)"/)?.[1];
    const title = decodeHtml(
      entryHtml.match(/<div class="flip-entry-title">([\s\S]*?)<\/div>/)?.[1] ?? id ?? "",
    ).trim();
    const thumbnailUrl = decodeHtml(entryHtml.match(/<div class="flip-entry-thumb"><img src="([^"]+)"/)?.[1] ?? "");
    const isFolder = href.includes("/drive/folders/") || entryHtml.includes(GOOGLE_DRIVE_FOLDER_MIME_TYPE);

    if (id && title) {
      entries.push({
        id,
        title,
        href,
        thumbnailUrl: thumbnailUrl || undefined,
        isFolder,
      });
    }
  }

  return entries;
};

const isImageEntry = (entry: DriveEntry) => IMAGE_FILE_PATTERN.test(entry.title);
const getImageFileType = (title: string) => title.match(IMAGE_FILE_PATTERN)?.[1].toLowerCase();

export const getLastDriveLoadWarning = () => lastDriveLoadWarning;

async function fetchFolderWallpapers(
  folderId: string,
  pathParts: string[],
  seenFolderIds: Set<string>,
): Promise<ArcaneWallpaper[]> {
  if (seenFolderIds.has(folderId)) {
    return [];
  }
  seenFolderIds.add(folderId);

  const response = await fetch(driveFolderUrl(folderId));
  if (!response.ok) {
    throw new Error(`Unable to load Google Drive folder ${folderId}: ${response.status}`);
  }

  const entries = parseDriveEntries(await response.text());
  const childFolders = entries.filter((entry) => entry.isFolder);
  const category = pathParts.join(" / ");
  const wallpapers = entries.filter(isImageEntry).map((entry) => ({
    title: entry.title.replace(IMAGE_FILE_PATTERN, ""),
    category,
    url: driveDownloadUrl(entry.id),
    fileType: getImageFileType(entry.title),
    thumbnailUrl: entry.thumbnailUrl ?? driveThumbnailUrl(entry.id),
  }));

  const nestedWallpapers: ArcaneWallpaper[][] = await Promise.all(
    childFolders.map((entry) => fetchFolderWallpapers(entry.id, [...pathParts, entry.title], seenFolderIds)),
  );

  return [...wallpapers, ...nestedWallpapers.flat()];
}

export async function getArcaneWallpapersFromDrive(): Promise<ArcaneWallpaper[]> {
  lastDriveLoadWarning = undefined;

  if (selectedDriveFolders.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    selectedDriveFolders.map((folder) =>
      fetchFolderWallpapers(folder.id, [folder.title], new Set<string>([ARCANE_DRIVE_FOLDER_ID])),
    ),
  );

  const failedFolders = results.filter((result) => result.status === "rejected");
  if (failedFolders.length > 0) {
    lastDriveLoadWarning = `Some Google Drive folders were unavailable. Showing ${selectedDriveFolders.length - failedFolders.length} of ${selectedDriveFolders.length} wallpaper groups.`;
    console.warn(lastDriveLoadWarning, failedFolders);
  }

  const wallpaperCatalog = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  if (wallpaperCatalog.length === 0) {
    throw new Error("No wallpapers found in the selected Google Drive folders.");
  }

  return wallpaperCatalog;
}
