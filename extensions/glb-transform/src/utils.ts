import { showHUD, getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { exec, ExecOptions } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import path from "path";

export const execAsync = promisify(exec);

// Raycast runs in a sandboxed environment without access to shell PATH
// We need to explicitly add common node installation paths
export const execOptions: ExecOptions = {
  env: {
    ...process.env,
    PATH: `/usr/local/bin:/opt/homebrew/bin:${process.env.PATH || ""}`,
  },
};

export interface CompressionResult {
  file: string;
  success: boolean;
  error?: string;
  originalSize?: number;
  compressedSize?: number;
}

export async function getFileSize(filePath: string): Promise<number> {
  const stats = await stat(filePath);
  return stats.size;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export type CompressionMode = "draco" | "ktx" | "full";

export async function compressGlb(filePath: string, mode: CompressionMode): Promise<CompressionResult> {
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  const baseName = path.basename(filePath, ".glb");

  // Create suffix based on compression mode
  const suffix = mode === "full" ? "_compressed" : `_${mode}`;
  const outputPath = path.join(dirName, `${baseName}${suffix}.glb`);

  try {
    // Get original file size
    const originalSize = await getFileSize(filePath);

    // Build the gltf-transform command based on mode
    let command: string;
    switch (mode) {
      case "draco":
        command = `gltf-transform optimize "${filePath}" "${outputPath}" --compress draco`;
        break;
      case "ktx":
        command = `gltf-transform optimize "${filePath}" "${outputPath}" --texture-compress ktx2`;
        break;
      case "full":
        command = `gltf-transform optimize "${filePath}" "${outputPath}" --compress draco --texture-compress ktx2`;
        break;
    }

    await execAsync(command, execOptions);

    // Get compressed file size
    const compressedSize = await getFileSize(outputPath);

    return {
      file: fileName,
      success: true,
      originalSize,
      compressedSize,
    };
  } catch (error) {
    console.error(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      file: fileName,
      success: false,
      error: errorMessage,
    };
  }
}

export async function processGlbFiles(mode: CompressionMode, modeName: string) {
  try {
    // Get selected files from Finder
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showHUD("❌ No files selected in Finder");
      return;
    }

    // Filter for .glb files only
    const glbFiles = selectedItems.filter((item) => item.path.toLowerCase().endsWith(".glb"));

    if (glbFiles.length === 0) {
      await showHUD("❌ No GLB files selected");
      return;
    }

    // Show initial toast
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `${modeName} compression...`,
      message: `Processing ${glbFiles.length} file${glbFiles.length > 1 ? "s" : ""}`,
    });

    // Process all GLB files
    const results: CompressionResult[] = [];

    for (let i = 0; i < glbFiles.length; i++) {
      const file = glbFiles[i];
      toast.message = `Processing ${i + 1}/${glbFiles.length}: ${path.basename(file.path)}`;

      const result = await compressGlb(file.path, mode);
      results.push(result);
    }

    // Calculate summary
    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    if (failed.length === 0) {
      // All successful
      const totalOriginal = successful.reduce((acc, r) => acc + (r.originalSize || 0), 0);
      const totalCompressed = successful.reduce((acc, r) => acc + (r.compressedSize || 0), 0);
      const savings = totalOriginal - totalCompressed;
      const savingsPercent = ((savings / totalOriginal) * 100).toFixed(1);

      await showHUD(
        `✅ ${modeName}: ${successful.length} file${successful.length > 1 ? "s" : ""} - Saved ${formatBytes(savings)} (${savingsPercent}%)`,
      );
    } else if (successful.length === 0) {
      // All failed
      await showHUD(`❌ Failed to compress ${failed.length} file${failed.length > 1 ? "s" : ""}`);
    } else {
      // Mixed results
      await showHUD(`⚠️ ${successful.length} compressed, ${failed.length} failed`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (errorMessage.includes("Finder")) {
      await showHUD("❌ Could not get Finder selection. Please select files in Finder first.");
    } else {
      await showHUD(`❌ Error: ${errorMessage}`);
    }
  }
}
