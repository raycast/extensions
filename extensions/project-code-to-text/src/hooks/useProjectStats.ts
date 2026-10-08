import { useState, useEffect } from "react";
import fs from "fs/promises";
import path from "path";
import { estimateTokens } from "../utils/tokens";
import { PREVIEW_MAX_FILES, PREVIEW_MAX_PATHS } from "../constants";

interface EstimatedStats {
  size: number;
  tokens: number;
}

/**
 * Hook to calculate preview statistics for project files.
 * Uses debounce to avoid recalculating on every keystroke.
 */
export function useProjectStats(
  currentStep: string,
  projectDirectory: string | null,
  processOnlySelectedFiles: boolean,
  selectedFilePaths: string[],
  maxFileSizeMbString: string,
) {
  const [estimatedStats, setEstimatedStats] = useState<EstimatedStats | null>(null);
  const [isCalculatingStats, setIsCalculatingStats] = useState(false);

  useEffect(() => {
    // Debounce calculation to avoid interrupting user input
    const timeoutId = setTimeout(() => {
      async function calculatePreviewStats() {
        if (currentStep !== "configureGeneration" || !projectDirectory) {
          return;
        }

        if (isCalculatingStats || estimatedStats) {
          return; // Already calculating or already calculated
        }

        setIsCalculatingStats(true);

        try {
          // Simple estimation based on file sizes without reading content
          // This avoids memory issues from generating full output
          let totalSize = 0;
          let fileCount = 0;

          const maxFileSizeBytes = parseFloat(maxFileSizeMbString || "1") * 1024 * 1024;

          async function scanDirectory(dirPath: string): Promise<void> {
            try {
              const entries = await fs.readdir(dirPath, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                try {
                  const stats = await fs.stat(fullPath);
                  if (entry.isDirectory()) {
                    // Skip common ignored directories
                    if (!["node_modules", ".git", "dist", "build", ".next", ".cache"].includes(entry.name)) {
                      await scanDirectory(fullPath);
                    }
                  } else if (entry.isFile() && stats.size <= maxFileSizeBytes) {
                    totalSize += stats.size;
                    fileCount++;
                    // Limit scanning to prevent long delays
                    if (fileCount >= PREVIEW_MAX_FILES) {
                      return;
                    }
                  }
                } catch {
                  // Ignore errors for individual files
                }
              }
            } catch {
              // Ignore directory read errors
            }
          }

          if (processOnlySelectedFiles && selectedFilePaths) {
            // Scan selected files/directories
            for (const selectedPath of selectedFilePaths.slice(0, PREVIEW_MAX_PATHS)) {
              // Limit paths for preview
              try {
                const stats = await fs.stat(selectedPath);
                if (stats.isDirectory()) {
                  await scanDirectory(selectedPath);
                } else if (stats.isFile() && stats.size <= maxFileSizeBytes) {
                  totalSize += stats.size;
                  fileCount++;
                }
              } catch {
                // Ignore errors
              }
            }
          } else {
            // Scan entire directory
            await scanDirectory(projectDirectory);
          }

          // Estimate output size: file content + structure + metadata
          // Add overhead for formatting (tags, metadata, etc.) - roughly 20% overhead
          const estimatedOutputSize = Math.floor(totalSize * 1.2);
          const estimatedTokens = estimateTokens("x".repeat(estimatedOutputSize));

          setEstimatedStats({ size: estimatedOutputSize, tokens: estimatedTokens });
          setIsCalculatingStats(false);
        } catch (error) {
          console.error("Error calculating preview stats:", error);
          setIsCalculatingStats(false);
        }
      }

      calculatePreviewStats();
    }, 1500); // 1.5s debounce to allow user to finish typing before recalculating stats

    return () => clearTimeout(timeoutId);
  }, [currentStep, projectDirectory, processOnlySelectedFiles, selectedFilePaths, maxFileSizeMbString]);

  return {
    estimatedStats,
    isCalculatingStats,
    setEstimatedStats,
  };
}
