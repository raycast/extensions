import * as path from "path";
import * as os from "os";
import * as fs from "fs/promises";
import {
  listFiles,
  listDirectories,
  getFileInfo,
  getFileHash,
  formatFileSize,
  moveToTrash,
  moveWithConflictResolution,
} from "./fileUtils";
import { UndoManager } from "./undoManager";

export interface OrganizationResult {
  duplicatesRemoved: number;
  filesArchived: number;
  largeFilesMoved: number;
  filesCategorized: number;
  foldersMoved: number;
  spaceSaved: number;
}

// File categories with their extensions
const FILE_CATEGORIES: Record<string, string[]> = {
  Music: [".mp3", ".m4a", ".wav", ".flac", ".aac", ".ogg", ".wma"],
  Videos: [".mp4", ".mov", ".avi", ".mkv", ".wmv", ".flv", ".webm", ".m4v", ".ts", ".3gp", ".m2ts"],
  Images: [
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".bmp",
    ".tiff",
    ".svg",
    ".webp",
    ".heic",
    ".heif",
    ".cr2",
    ".nef",
    ".arw",
    ".rw2",
    ".dng",
    ".orf",
    ".raf",
  ],
  PDFs: [".pdf"],
  Documents: [".doc", ".docx", ".pages", ".odt"],
  Spreadsheets: [".xls", ".xlsx", ".ods", ".numbers", ".csv"],
  Presentations: [".ppt", ".pptx", ".key", ".odp"],
  Text: [".txt", ".rtf", ".md", ".markdown"],
  Design: [".psd", ".ai", ".xd", ".sketch", ".fig", ".indd"],
  Fonts: [".ttf", ".otf", ".woff", ".woff2"],
  Ebooks: [".epub", ".mobi", ".azw", ".azw3", ".ibooks", ".cbz", ".cbr"],
  Subtitles: [".srt", ".vtt", ".ass", ".ssa", ".sub"],
  Software: [".dmg", ".pkg", ".app", ".iso", ".apk", ".ipa"],
  Archives: [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz", ".tgz", ".tbz2", ".zst"],
  Code: [
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".html",
    ".css",
    ".java",
    ".cpp",
    ".c",
    ".hpp",
    ".h",
    ".cs",
    ".php",
    ".rb",
    ".go",
    ".swift",
    ".kt",
    ".rs",
    ".sh",
    ".ipynb",
  ],
  Data: [".json", ".xml", ".yaml", ".yml", ".tsv", ".ndjson", ".parquet", ".avro"],
  "3D": [".stl", ".obj", ".fbx", ".step", ".stp", ".dwg", ".dxf", ".blend"],
  Torrents: [".torrent"],
};

const SPECIAL_FOLDERS = ["Archived", "Large Files", "Misc", "Folders"];

/**
 * Find and remove duplicate files
 */
async function findDuplicates(
  dirPath: string,
  undoManager?: UndoManager,
): Promise<{ count: number; spaceSaved: number }> {
  console.log("\n🔍 Scanning for duplicate files...");

  const files = await listFiles(dirPath);
  if (files.length === 0) {
    console.log("   ✅ No files to check");
    return { count: 0, spaceSaved: 0 };
  }

  // Group files by size first (quick filter)
  const sizeGroups: Map<number, string[]> = new Map();

  for (const filePath of files) {
    const info = await getFileInfo(filePath);
    if (!info) continue;

    if (!sizeGroups.has(info.size)) {
      sizeGroups.set(info.size, []);
    }
    sizeGroups.get(info.size)!.push(filePath);
  }

  // Find potential duplicates (same size)
  const potentialDuplicates: string[] = [];
  for (const [, files] of sizeGroups) {
    if (files.length > 1) {
      potentialDuplicates.push(...files);
    }
  }

  if (potentialDuplicates.length === 0) {
    console.log("   ✅ No duplicates found");
    return { count: 0, spaceSaved: 0 };
  }

  console.log(`   🔎 Checking ${potentialDuplicates.length} potential duplicates...`);

  // Group by hash for exact duplicates
  const hashGroups: Map<string, string[]> = new Map();

  for (const filePath of potentialDuplicates) {
    const hash = await getFileHash(filePath);
    if (!hash) continue;

    if (!hashGroups.has(hash)) {
      hashGroups.set(hash, []);
    }
    hashGroups.get(hash)!.push(filePath);
  }

  // Find actual duplicates
  const duplicatesToRemove: string[] = [];
  for (const [, files] of hashGroups) {
    if (files.length > 1) {
      // Sort by modification time (keep oldest)
      files.sort((a, b) => {
        const statA = a;
        const statB = b;
        return statA.localeCompare(statB);
      });
      duplicatesToRemove.push(...files.slice(1)); // All except the first (oldest)
    }
  }

  let spaceSaved = 0;
  let count = 0;

  if (duplicatesToRemove.length > 0) {
    console.log(`   🗑️  Found ${duplicatesToRemove.length} duplicate files:`);

    for (const filePath of duplicatesToRemove) {
      const info = await getFileInfo(filePath);
      if (!info) continue;

      spaceSaved += info.size;
      console.log(`      • ${info.name} (${formatFileSize(info.size)})`);

      if (await moveToTrash(filePath, undoManager)) {
        count++;
        console.log(`        ✅ Moved to Trash`);
      } else {
        console.log(`        ❌ Failed to move to Trash`);
      }
    }

    console.log(`   💾 Space saved: ${formatFileSize(spaceSaved)}`);
  } else {
    console.log("   ✅ No exact duplicates found");
  }

  return { count, spaceSaved };
}

/**
 * Find and move large files (>1GB)
 */
async function findLargeFiles(dirPath: string, undoManager?: UndoManager): Promise<number> {
  console.log("\n🐘 Scanning for large files (>1GB)...");

  const GB_THRESHOLD = 1024 * 1024 * 1024; // 1GB
  const files = await listFiles(dirPath);
  const largeFiles: Array<{ path: string; size: number }> = [];

  for (const filePath of files) {
    const info = await getFileInfo(filePath);
    if (!info) continue;

    if (info.size > GB_THRESHOLD) {
      largeFiles.push({ path: filePath, size: info.size });
    }
  }

  if (largeFiles.length === 0) {
    console.log("   ✅ No large files found");
    return 0;
  }

  // Sort by size (largest first)
  largeFiles.sort((a, b) => b.size - a.size);

  console.log(`   📦 Found ${largeFiles.length} large files:`);
  const largeFilesDir = path.join(dirPath, "Large Files");

  let movedCount = 0;

  for (const { path: filePath, size } of largeFiles) {
    const fileName = path.basename(filePath);
    console.log(`      • ${fileName} (${formatFileSize(size)})`);

    const newPath = await moveWithConflictResolution(filePath, largeFilesDir, undoManager);
    if (newPath) {
      movedCount++;
    }
  }

  return movedCount;
}

/**
 * Archive old files
 */
async function archiveOldFiles(dirPath: string, daysThreshold: number, undoManager?: UndoManager): Promise<number> {
  console.log(`\n📅 Archiving files older than ${daysThreshold} days...`);

  const files = await listFiles(dirPath);
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

  const oldFiles: string[] = [];

  for (const filePath of files) {
    const info = await getFileInfo(filePath);
    if (!info) continue;

    if (info.mtime < cutoffDate) {
      oldFiles.push(filePath);
    }
  }

  if (oldFiles.length === 0) {
    console.log("   ✅ No old files to archive");
    return 0;
  }

  console.log(`   📦 Found ${oldFiles.length} old files`);
  const archivedDir = path.join(dirPath, "Archived");

  let archivedCount = 0;

  for (const filePath of oldFiles) {
    const fileName = path.basename(filePath);
    const info = await getFileInfo(filePath);
    if (!info) continue;

    const daysOld = Math.floor((Date.now() - info.mtime.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`      • ${fileName} (${daysOld} days old)`);

    const newPath = await moveWithConflictResolution(filePath, archivedDir, undoManager);
    if (newPath) {
      archivedCount++;
    }
  }

  return archivedCount;
}

/**
 * Organize files by type
 */
async function organizeByType(
  dirPath: string,
  undoManager?: UndoManager,
): Promise<{ categorized: number; foldersMoved: number }> {
  console.log("\n🗂️  Organizing remaining files by type...");

  const files = await listFiles(dirPath);
  const directories = await listDirectories(dirPath);

  let categorized = 0;
  let foldersMoved = 0;

  // Handle directories
  for (const dir of directories) {
    const dirName = path.basename(dir);

    // Skip special folders and category folders
    if (SPECIAL_FOLDERS.includes(dirName) || Object.keys(FILE_CATEGORIES).includes(dirName)) {
      continue;
    }

    // Handle .app bundles
    if (dir.endsWith(".app")) {
      const softwareDir = path.join(dirPath, "Software");
      const newPath = await moveWithConflictResolution(dir, softwareDir, undoManager);
      if (newPath) {
        foldersMoved++;
      }
      continue;
    }

    // Move to Folders directory
    const foldersDir = path.join(dirPath, "Folders");
    const newPath = await moveWithConflictResolution(dir, foldersDir, undoManager);
    if (newPath) {
      foldersMoved++;
    }
  }

  // Handle files by category
  for (const filePath of files) {
    const info = await getFileInfo(filePath);
    if (!info) continue;

    // Skip incomplete downloads
    if ([".part", ".crdownload"].includes(info.extension)) {
      continue;
    }

    let moved = false;

    // Find category for file
    for (const [category, extensions] of Object.entries(FILE_CATEGORIES)) {
      if (extensions.includes(info.extension)) {
        const categoryDir = path.join(dirPath, category);
        const newPath = await moveWithConflictResolution(filePath, categoryDir, undoManager);
        if (newPath) {
          categorized++;
          moved = true;
        }
        break;
      }
    }

    // Move to Misc if no category matched
    if (!moved && info.extension) {
      const miscDir = path.join(dirPath, "Misc");
      const newPath = await moveWithConflictResolution(filePath, miscDir, undoManager);
      if (newPath) {
        categorized++;
      }
    }
  }

  return { categorized, foldersMoved };
}

/**
 * Organize a directory
 */
export async function organizeDirectory(
  dirPath: string,
  options: {
    findDuplicates?: boolean;
    archiveOldFiles?: boolean;
    daysThreshold?: number;
    findLargeFiles?: boolean;
    organizeByType?: boolean;
    undoManager?: UndoManager;
  } = {},
): Promise<OrganizationResult> {
  const {
    findDuplicates: checkDupes = true,
    archiveOldFiles: archive = false,
    daysThreshold = 60,
    findLargeFiles: checkLarge = true,
    organizeByType: organize = true,
    undoManager,
  } = options;

  console.log("🧹 Starting comprehensive organization...");
  console.log(`📁 Location: ${dirPath}`);

  const result: OrganizationResult = {
    duplicatesRemoved: 0,
    filesArchived: 0,
    largeFilesMoved: 0,
    filesCategorized: 0,
    foldersMoved: 0,
    spaceSaved: 0,
  };

  // Step 1: Find and remove duplicates
  if (checkDupes) {
    const dupeResult = await findDuplicates(dirPath, undoManager);
    result.duplicatesRemoved = dupeResult.count;
    result.spaceSaved = dupeResult.spaceSaved;
  }

  // Step 2: Archive old files
  if (archive) {
    result.filesArchived = await archiveOldFiles(dirPath, daysThreshold, undoManager);
  }

  // Step 3: Handle large files
  if (checkLarge) {
    result.largeFilesMoved = await findLargeFiles(dirPath, undoManager);
  }

  // Step 4: Organize by type
  if (organize) {
    const orgResult = await organizeByType(dirPath, undoManager);
    result.filesCategorized = orgResult.categorized;
    result.foldersMoved = orgResult.foldersMoved;
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 ORGANIZATION COMPLETE!");
  console.log("=".repeat(50));

  const totalItems =
    result.duplicatesRemoved +
    result.filesArchived +
    result.largeFilesMoved +
    result.filesCategorized +
    result.foldersMoved;

  if (totalItems === 0) {
    console.log("\n✨ Folder is already perfectly organized!");
  } else {
    console.log(`\n🏆 TOTAL ITEMS PROCESSED: ${totalItems}`);
    if (result.spaceSaved > 0) {
      console.log(`💾 SPACE SAVED: ${formatFileSize(result.spaceSaved)}`);
    }
  }

  return result;
}

/**
 * Organize Downloads folder
 */
export async function organizeDownloads(undoManager?: UndoManager): Promise<OrganizationResult> {
  const downloadsPath = path.join(os.homedir(), "Downloads");
  return organizeDirectory(downloadsPath, {
    findDuplicates: true,
    archiveOldFiles: true,
    daysThreshold: 60,
    findLargeFiles: true,
    organizeByType: true,
    undoManager,
  });
}

/**
 * Organize Desktop
 */
export async function organizeDesktop(undoManager?: UndoManager): Promise<OrganizationResult> {
  const desktopPath = path.join(os.homedir(), "Desktop");
  return organizeDirectory(desktopPath, {
    findDuplicates: true,
    archiveOldFiles: true,
    daysThreshold: 30, // Shorter threshold for desktop
    findLargeFiles: true,
    organizeByType: true,
    undoManager,
  });
}

/**
 * Get ordinal suffix for day (1st, 2nd, 3rd, etc.)
 */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return "th";
  }
  const lastDigit = day % 10;
  switch (lastDigit) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/**
 * Format date as folder name: "11-5th November 2025"
 */
function formatDateFolderName(date: Date): string {
  const day = date.getDate();
  const ordinal = getOrdinalSuffix(day);
  const month = date.toLocaleString("en-US", { month: "long" });
  const monthNumber = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${monthNumber}-${day}${ordinal} ${month} ${year}`;
}

/**
 * Organize files in Temp folder by creation date
 */
async function organizeTempByDate(dirPath: string, undoManager?: UndoManager): Promise<{ organized: number }> {
  console.log("\n📅 Organizing files by creation date...");

  const files = await listFiles(dirPath);
  const directories = await listDirectories(dirPath);
  const allItems = [...files, ...directories];

  let organized = 0;
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  for (const itemPath of allItems) {
    const itemName = path.basename(itemPath);

    // Skip special folders
    if (SPECIAL_FOLDERS.includes(itemName)) {
      continue;
    }

    // Skip existing date folders
    if (monthNames.some((month) => itemName.includes(month))) {
      continue;
    }

    try {
      const stats = await fs.stat(itemPath);
      const creationDate = stats.birthtime;
      const folderName = formatDateFolderName(creationDate);
      const dateFolder = path.join(dirPath, folderName);

      const newPath = await moveWithConflictResolution(itemPath, dateFolder, undoManager);
      if (newPath) {
        organized++;
        console.log(`   • Moved ${itemName} to ${folderName}`);
      }
    } catch (error) {
      console.error(`   ❌ Error organizing ${itemName}:`, error);
    }
  }

  return { organized };
}

/**
 * Clean empty date folders
 */
async function cleanEmptyDateFolders(dirPath: string): Promise<void> {
  const directories = await listDirectories(dirPath);
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  for (const dir of directories) {
    const dirName = path.basename(dir);

    // Check if it's a date folder
    if (!monthNames.some((month) => dirName.includes(month))) {
      continue;
    }

    try {
      const contents = await fs.readdir(dir);
      const visibleContents = contents.filter((name) => !name.startsWith("."));

      if (visibleContents.length === 0) {
        await fs.rmdir(dir);
        console.log(`   🗑️ Removed empty folder: ${dirName}`);
      }
    } catch (error) {
      console.error(`   ❌ Error cleaning ${dirName}:`, error);
    }
  }
}

/**
 * Organize Temp folder by creation date
 */
export async function organizeTemp(undoManager?: UndoManager): Promise<OrganizationResult> {
  const tempPath = path.join(os.homedir(), "Documents", "Temp");

  console.log("🧹 Starting Temp folder organization...");
  console.log(`📁 Location: ${tempPath}`);

  const result: OrganizationResult = {
    duplicatesRemoved: 0,
    filesArchived: 0,
    largeFilesMoved: 0,
    filesCategorized: 0,
    foldersMoved: 0,
    spaceSaved: 0,
  };

  // Step 1: Find and remove duplicates
  const dupeResult = await findDuplicates(tempPath, undoManager);
  result.duplicatesRemoved = dupeResult.count;
  result.spaceSaved = dupeResult.spaceSaved;

  // Step 2: Handle large files
  result.largeFilesMoved = await findLargeFiles(tempPath, undoManager);

  // Step 3: Clean empty date folders first
  await cleanEmptyDateFolders(tempPath);

  // Step 4: Organize by creation date
  const orgResult = await organizeTempByDate(tempPath, undoManager);
  result.filesCategorized = orgResult.organized; // Using this field for date-organized items

  console.log("\n" + "=".repeat(50));
  console.log("🎉 TEMP ORGANIZATION COMPLETE!");
  console.log("=".repeat(50));

  const totalItems = result.duplicatesRemoved + result.largeFilesMoved + result.filesCategorized;

  if (totalItems === 0) {
    console.log("\n✨ Temp folder is already perfectly organized!");
  } else {
    console.log(`\n🏆 TOTAL ITEMS PROCESSED: ${totalItems}`);
    if (result.spaceSaved > 0) {
      console.log(`💾 SPACE SAVED: ${formatFileSize(result.spaceSaved)}`);
    }
  }

  return result;
}
