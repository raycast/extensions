import { showToast, Toast, open } from "@raycast/api";
import { writeFileSync, mkdirSync, createWriteStream, rm } from "fs";
import { join } from "path";
import { homedir } from "os";
import archiver from "archiver";
import { getFolders } from "./fetchData";
import { Folder } from "./types";

export interface ExportOptions {
  maxItems?: number;
  filePrefix?: string;
  zipPrefix?: string;
}

export interface BatchProcessingOptions {
  totalItems: number;
  batchSize?: number;
  onProgress?: (processed: number, total: number, eta: string) => void;
}

export interface FolderOrganization {
  documentToFolders: Record<string, string>;
  folderGroups: Record<string, string[]>;
  unorganizedItems: string[];
}

/**
 * Sanitizes a filename by replacing invalid characters and limiting length
 */
export const sanitizeFileName = (fileName: string): string => {
  const sanitized = fileName
    .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid characters
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .substring(0, 100); // Limit length

  // Validate that the result is not empty or only underscores
  const trimmed = sanitized.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  if (!trimmed || trimmed.length === 0) {
    return "unnamed_file";
  }

  return sanitized;
};

/**
 * Calculates dynamic batch size based on total number of items
 */
export const getDynamicBatchSize = (totalItems: number): number => {
  if (totalItems <= 10) return Math.min(5, totalItems);
  if (totalItems <= 50) return Math.min(10, totalItems);
  if (totalItems <= 150) return Math.min(15, totalItems);
  return Math.min(20, totalItems);
};

/**
 * Calculates estimated time and formats display string
 */
export const calculateETA = (remainingItems: number, batchSize: number): string => {
  const remainingBatches = Math.ceil(remainingItems / batchSize);
  const etaSeconds = remainingBatches * (batchSize * 0.5 + 0.1);
  return etaSeconds > 60 ? `${Math.ceil(etaSeconds / 60)}m` : `${Math.ceil(etaSeconds)}s`;
};

/**
 * Formats progress message with percentage and ETA
 */
export const formatProgressMessage = (processed: number, total: number, eta?: string): string => {
  const progressPercent = Math.round((processed / total) * 100);
  const baseMessage = `${processed}/${total} (${progressPercent}%)`;
  return eta ? `${baseMessage} - ETA: ${eta}` : baseMessage;
};

/**
 * Gets folder organization for documents
 */
export const getDocumentFolderOrganization = async (documentIds: string[]): Promise<FolderOrganization> => {
  const documentToFolders: Record<string, string> = {};
  const folderGroups: Record<string, string[]> = {};
  const unorganizedItems: string[] = [];

  try {
    const foldersResponse = await getFolders();
    const folders = Object.values(foldersResponse.lists) as Folder[];

    // Create mapping of document ID to folder name
    for (const folder of folders) {
      const sanitizedFolderName = sanitizeFileName(folder.title);
      for (const docId of folder.document_ids) {
        if (documentIds.includes(docId)) {
          documentToFolders[docId] = sanitizedFolderName;
          if (!folderGroups[sanitizedFolderName]) {
            folderGroups[sanitizedFolderName] = [];
          }
          folderGroups[sanitizedFolderName].push(docId);
        }
      }
    }

    // Find unorganized documents
    for (const docId of documentIds) {
      if (!documentToFolders[docId]) {
        unorganizedItems.push(docId);
      }
    }
  } catch (error) {
    // If folder fetching fails, treat all items as unorganized
    unorganizedItems.push(...documentIds);
  }

  return { documentToFolders, folderGroups, unorganizedItems };
};

/**
 * Sanitizes a prefix by removing path separators and suspicious sequences
 */
export const sanitizePrefix = (prefix: string): string => {
  return prefix
    .replace(/[<>:"/\\|?*]/g, "_") // Replace invalid path characters
    .replace(/\.\./g, "_") // Remove parent directory references
    .replace(/[/\\]/g, "_") // Remove path separators
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .substring(0, 50); // Limit length for directory names
};

/**
 * Creates a temporary directory for export files
 */
export const createTempDirectory = (prefix: string): string => {
  const sanitizedPrefix = sanitizePrefix(prefix);
  const timestamp =
    new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] +
    "_" +
    new Date().toTimeString().split(" ")[0].replace(/:/g, "-");

  const tempDir = join(homedir(), "Downloads", `${sanitizedPrefix}_${timestamp}`);

  try {
    mkdirSync(tempDir, { recursive: true });
    return tempDir;
  } catch (error) {
    throw new Error(`Failed to create temporary directory: ${error}`);
  }
};

/**
 * Creates folder structure within temp directory
 */
export const createFolderStructure = (tempDir: string, folderName: string): string => {
  const folderPath = join(tempDir, folderName);
  try {
    mkdirSync(folderPath, { recursive: true });
    return folderPath;
  } catch (error) {
    return tempDir;
  }
};

/**
 * Writes content to file with proper path handling
 */
export const writeExportFile = (tempDir: string, fileName: string, content: string, folderName?: string): string => {
  const sanitizedFileName = sanitizeFileName(fileName);
  let filePath: string;

  if (folderName) {
    const folderPath = createFolderStructure(tempDir, folderName);
    filePath = join(folderPath, sanitizedFileName);
  } else {
    filePath = join(tempDir, sanitizedFileName);
  }

  writeFileSync(filePath, content, "utf8");
  return folderName ? `${folderName}/${sanitizedFileName}` : sanitizedFileName;
};

/**
 * Creates zip file from temporary directory using archiver library
 */
export const createZipArchive = async (tempDir: string, zipFileName: string): Promise<string> => {
  const zipPath = join(homedir(), "Downloads", zipFileName);

  return new Promise<string>((resolve, reject) => {
    // Create a file to stream archive data to
    const output = createWriteStream(zipPath);
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Maximum compression
    });

    // Handle stream events
    output.on("close", () => {
      resolve(zipPath);
    });

    output.on("error", (err: Error) => {
      reject(new Error(`Output stream error: ${err.message}`));
    });

    archive.on("error", (err: Error) => {
      reject(new Error(`Archive error: ${err.message}`));
    });

    archive.on("warning", (err: Error & { code?: string }) => {
      if (err.code !== "ENOENT") {
        reject(new Error(`Archive warning escalated to error: ${err.message}`));
      }
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add the entire temp directory to the archive
    archive.directory(tempDir, false);

    // Finalize the archive (this will trigger the 'close' event)
    archive.finalize().catch((err: Error) => {
      reject(new Error(`Failed to finalize archive: ${err.message}`));
    });
  });
};

/**
 * Cleans up temporary directory
 */
export const cleanupTempDirectory = (tempDir: string): void => {
  rm(tempDir, { recursive: true, force: true }, (error) => {
    if (error) {
      return;
    }
  });
};

/**
 * Opens the Downloads folder
 */
export const openDownloadsFolder = (): void => {
  open(join(homedir(), "Downloads"));
};

/**
 * Shows final export success toast with option to open Downloads folder
 */
export const showExportSuccessToast = async (zipFileName: string): Promise<void> => {
  await showToast({
    style: Toast.Style.Success,
    title: "Export complete!",
    message: `Saved to Downloads/${zipFileName}`,
    primaryAction: {
      title: "Open Downloads Folder",
      onAction: openDownloadsFolder,
    },
  });
};

/**
 * Validates export parameters and shows appropriate error messages
 */
export const validateExportParameters = async (itemCount: number, options: ExportOptions = {}): Promise<boolean> => {
  const maxItems = options.maxItems || 500;

  if (itemCount === 0) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No items to export",
      message: "Please select at least one item to export.",
    });
    return false;
  }

  if (itemCount > maxItems) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Too many items",
      message: `Please select ${maxItems} or fewer items for export.`,
    });
    return false;
  }

  return true;
};

/**
 * Creates standardized export filename with timestamp
 */
export const createExportFilename = (prefix: string, extension: string = "zip"): string => {
  const timestamp =
    new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] +
    "_" +
    new Date().toTimeString().split(" ")[0].replace(/:/g, "-");

  return `${prefix}_${timestamp}.${extension}`;
};

/**
 * Processes items in batches with progress tracking
 */
export const processBatchWithProgress = async <T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[], batchIndex: number) => Promise<void>,
  onProgress?: (processed: number, total: number, eta: string) => void,
): Promise<void> => {
  let processedCount = 0;

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Calculate progress and ETA
    if (onProgress) {
      const remainingItems = items.length - processedCount;
      const eta = calculateETA(remainingItems, batchSize);
      onProgress(processedCount, items.length, eta);
    }

    // Process batch
    await processor(batch, Math.floor(i / batchSize));

    processedCount += batch.length;

    // Brief pause between batches for cleanup
    if (i + batchSize < items.length) {
      const pauseTime = Math.max(50, Math.min(200, batchSize * 10));
      await new Promise((resolve) => setTimeout(resolve, pauseTime));
    }
  }
};
