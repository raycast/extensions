import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { fileTypeFromFile } from "file-type";
import path from "path";
import fs from "fs";
import { ProcessingResult, BatchResult, ProcessingOptions, OperationStage } from "./types";
import { compressImage, compressVideo } from "./compression";
import { resizeImage, resizeVideo } from "./resize";

interface Preferences {
  outputFolderName?: string;
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Process multiple files with progress tracking
 */
export async function processBatch(filePaths: string[], options: ProcessingOptions): Promise<BatchResult> {
  const results: ProcessingResult[] = [];
  const errors: Array<{ file: string; error: string }> = [];
  let totalOriginalSize = 0;
  let totalProcessedSize = 0;
  let successCount = 0;
  let failureCount = 0;

  const preferences = getPreferenceValues<Preferences>();
  const outputFolderName = preferences.outputFolderName?.trim();

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    const fileName = path.basename(filePath);
    const fileNumber = i + 1;
    const totalFiles = filePaths.length;
    const sourceDir = path.dirname(filePath);

    try {
      // Update toast with current file
      await showToast({
        style: Toast.Style.Animated,
        title: `Processing file ${fileNumber} of ${totalFiles}`,
        message: fileName,
      });

      // Detect file type
      const fileType = await fileTypeFromFile(filePath);
      if (!fileType) {
        errors.push({ file: fileName, error: "Could not determine file type" });
        failureCount++;
        continue;
      }

      const { mime } = fileType;
      const isImage = mime.startsWith("image/");
      const isVideo = mime.startsWith("video/");

      if (!isImage && !isVideo) {
        errors.push({ file: fileName, error: `Unsupported file type: ${mime}` });
        failureCount++;
        continue;
      }

      // Progress callback for individual file
      const progressCallback = (stage: OperationStage | string, percentage: number) => {
        showToast({
          style: Toast.Style.Animated,
          title: `File ${fileNumber}/${totalFiles} (${Math.round(((fileNumber - 1 + percentage / 100) / totalFiles) * 100)}%)`,
          message: `${stage}: ${fileName}`,
        });
      };

      let result: ProcessingResult | null = null;
      const intermediateFiles: string[] = [];

      // Process based on options
      if (options.resize && options.compress) {
        // Two-stage: resize then compress
        if (isImage) {
          const resizeResult = await resizeImage(filePath, options.resizePreset!, progressCallback);
          if (resizeResult.success && resizeResult.outputPath) {
            intermediateFiles.push(resizeResult.outputPath);
            result = await compressImage(resizeResult.outputPath, progressCallback);
            // Update result to reflect original file
            if (result.success) {
              result.originalSize = resizeResult.originalSize;
            }
          } else {
            result = resizeResult;
          }
        } else {
          const resizeResult = await resizeVideo(filePath, options.resizePreset!, progressCallback);
          if (resizeResult.success && resizeResult.outputPath) {
            intermediateFiles.push(resizeResult.outputPath);
            result = await compressVideo(resizeResult.outputPath, progressCallback);
            if (result.success) {
              result.originalSize = resizeResult.originalSize;
            }
          } else {
            result = resizeResult;
          }
        }
      } else if (options.resize) {
        // Resize only
        result = isImage
          ? await resizeImage(filePath, options.resizePreset!, progressCallback)
          : await resizeVideo(filePath, options.resizePreset!, progressCallback);
      } else if (options.compress) {
        // Compress only
        result = isImage
          ? await compressImage(filePath, progressCallback)
          : await compressVideo(filePath, progressCallback);
      }

      if (result && result.success && result.outputPath) {
        // Handle output folder
        let finalPath = result.outputPath;
        if (outputFolderName) {
          const targetDir = path.join(sourceDir, outputFolderName);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          const newPath = path.join(targetDir, path.basename(result.outputPath));

          // Move file only if destination is different
          if (newPath !== result.outputPath) {
            // Rename might fail across partitions, so we should be careful,
            // but usually it's in the same subfolder
            fs.renameSync(result.outputPath, newPath);
            finalPath = newPath;
            result.outputPath = newPath;
          }
        }

        // Clean up intermediate files
        for (const tempFile of intermediateFiles) {
          if (fs.existsSync(tempFile) && tempFile !== finalPath) {
            fs.unlinkSync(tempFile);
          }
        }

        results.push(result);
        successCount++;
        totalOriginalSize += result.originalSize || 0;
        totalProcessedSize += result.processedSize || 0;
      } else if (result) {
        failureCount++;
        errors.push({ file: fileName, error: result.error || "Unknown error" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      errors.push({ file: fileName, error: errorMessage });
      failureCount++;
    }
  }

  return {
    totalFiles: filePaths.length,
    successCount,
    failureCount,
    totalOriginalSize,
    totalProcessedSize,
    results,
    errors,
  };
}

/**
 * Generate a summary message for batch results
 */
export function generateBatchSummary(result: BatchResult, operationName: string): string {
  const { totalFiles, successCount, failureCount, totalOriginalSize, totalProcessedSize } = result;

  if (successCount === 0) {
    return `❌ Failed to ${operationName.toLowerCase()} ${totalFiles} file${totalFiles > 1 ? "s" : ""}`;
  }

  const savings = totalOriginalSize > 0 ? ((1 - totalProcessedSize / totalOriginalSize) * 100).toFixed(1) : "0";

  const savedBytes = totalOriginalSize - totalProcessedSize;

  let summary = `✅ ${operationName} ${successCount} file${successCount > 1 ? "s" : ""}!`;

  if (totalOriginalSize > 0 && totalProcessedSize > 0) {
    summary += `\nSaved ${formatBytes(savedBytes)} (${savings}% reduction)`;
  }

  if (failureCount > 0) {
    summary += `\n⚠️ ${failureCount} file${failureCount > 1 ? "s" : ""} failed`;
  }

  return summary;
}
