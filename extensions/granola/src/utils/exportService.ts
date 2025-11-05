import { showToast, Toast } from "@raycast/api";
import {
  getDynamicBatchSize,
  validateExportParameters,
  createTempDirectory,
  writeExportFile,
  createZipArchive,
  cleanupTempDirectory,
  showExportSuccessToast,
  getDocumentFolderOrganization,
  calculateETA,
} from "./exportHelpers";

export interface ExportResult {
  noteId: string;
  title: string;
  status: "success" | "error" | "pending";
  error?: string;
  fileName?: string;
  fileSize?: number;
  folderName?: string;
}

export interface ExportOptions {
  maxItems?: number;
  filePrefix?: string;
  zipPrefix?: string;
  includeOrganization?: boolean;
}

export interface ProgressCallback {
  (processed: number, total: number, eta: string): void;
}

export interface ExportableItem {
  id: string;
  title?: string;
}

/**
 * Shared export service for batch processing notes and transcripts
 */
export class ExportService {
  /**
   * Process items in batches with progress tracking and error handling
   */
  static async processBatchExport<T extends ExportableItem>(
    items: T[],
    processor: (item: T) => Promise<{
      content: string;
      fileName: string;
      folderName?: string;
    }>,
    options: ExportOptions = {},
    onProgress?: ProgressCallback,
  ): Promise<{
    results: ExportResult[];
    tempDir: string;
    documentToFolders: Record<string, string>;
  }> {
    const { maxItems = 500, includeOrganization = true } = options;

    // Validate parameters
    const isValid = await validateExportParameters(items.length, { maxItems });
    if (!isValid) {
      throw new Error("Export validation failed");
    }

    // Get folder organization if needed
    let documentToFolders: Record<string, string> = {};
    if (includeOrganization) {
      const documentIds = items.map((item) => item.id).filter(Boolean);
      const folderOrganization = await getDocumentFolderOrganization(documentIds);
      documentToFolders = folderOrganization.documentToFolders;
    }

    // Create temporary directory
    const tempDir = createTempDirectory(options.filePrefix || "granola_export");
    const results: ExportResult[] = [];

    // Initialize results
    items.forEach((item) => {
      results.push({
        noteId: item.id,
        title: item.title || "Untitled",
        status: "pending",
        folderName: includeOrganization ? documentToFolders[item.id] : undefined,
      });
    });

    // Process in batches
    const batchSize = getDynamicBatchSize(items.length);
    let processedCount = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      // Process batch in parallel
      await Promise.all(
        batch.map(async (item) => {
          const folderFromOrganization = includeOrganization ? documentToFolders[item.id] : undefined;
          let resolvedFolderName = folderFromOrganization;

          try {
            const { content, fileName, folderName } = await processor(item);
            resolvedFolderName = folderName ?? folderFromOrganization;
            const relativePath = writeExportFile(tempDir, fileName, content, resolvedFolderName);

            // Update result
            const resultIndex = results.findIndex((r) => r.noteId === item.id);
            if (resultIndex !== -1) {
              results[resultIndex] = {
                ...results[resultIndex],
                status: "success",
                fileName: relativePath,
                fileSize: content.length,
                folderName: resolvedFolderName,
              };
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const resultIndex = results.findIndex((r) => r.noteId === item.id);
            if (resultIndex !== -1) {
              results[resultIndex] = {
                ...results[resultIndex],
                status: "error",
                error: errorMessage,
                folderName: resolvedFolderName,
              };
            }
          }
        }),
      );

      processedCount += batch.length;

      // Update progress after processing
      if (onProgress) {
        const remainingItems = items.length - processedCount;
        const eta = calculateETA(remainingItems, batchSize);
        onProgress(processedCount, items.length, eta);
      }

      // Brief pause between batches
      if (i + batchSize < items.length) {
        const pauseTime = Math.max(50, Math.min(200, batchSize * 10));
        await new Promise((resolve) => setTimeout(resolve, pauseTime));
      }
    }

    return {
      results,
      tempDir,
      documentToFolders,
    };
  }

  /**
   * Create and download a zip file from the processed results
   */
  static async createAndDownloadZip(tempDir: string, zipFileName: string): Promise<void> {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Creating zip archive",
      message: "Compressing files...",
    });

    try {
      await createZipArchive(tempDir, zipFileName);
      cleanupTempDirectory(tempDir);

      await showExportSuccessToast(zipFileName);
    } catch (error) {
      cleanupTempDirectory(tempDir);
      toast.style = Toast.Style.Failure;
      toast.title = "Export failed";
      toast.message = String(error);
      throw error;
    }
  }

  /**
   * Get export statistics from results
   */
  static getExportStats(results: ExportResult[]): {
    total: number;
    successful: number;
    failed: number;
    successResults: ExportResult[];
    errorResults: ExportResult[];
  } {
    const successful = results.filter((r) => r.status === "success");
    const failed = results.filter((r) => r.status === "error");

    return {
      total: results.length,
      successful: successful.length,
      failed: failed.length,
      successResults: successful,
      errorResults: failed,
    };
  }
}
