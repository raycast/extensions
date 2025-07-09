import { useState } from "react";
import { showToast, Toast, showHUD } from "@raycast/api";
import { downloadIPA } from "../ipatool";
import { handleDownloadError } from "../utils/error-handler";

// Global download state to prevent concurrent downloads across all hook instances
const globalDownloadState = {
  isDownloading: false,
  currentApp: null as string | null,
};

/**
 * Hook for downloading an app
 * @returns Object with download function and loading state
 */
export function useAppDownload() {
  const [isLoading, setIsLoading] = useState(globalDownloadState.isDownloading);
  const [currentDownload, setCurrentDownload] = useState<string | null>(globalDownloadState.currentApp);

  /**
   * Download an app using ipatool
   * @param bundleId The bundle ID of the app to download
   * @param name The name of the app
   * @param version The version of the app
   * @param price The price of the app
   * @param showHudMessages Whether to show HUD messages during download
   * @returns The path to the downloaded file or undefined if download failed
   */
  const downloadApp = async (
    bundleId: string,
    name: string,
    version: string,
    price: string,
    showHudMessages = true,
  ): Promise<string | null | undefined> => {
    // Prevent concurrent downloads globally
    if (globalDownloadState.isDownloading) {
      await handleDownloadError(
        new Error(`Download already in progress for ${globalDownloadState.currentApp || "another app"}`),
        "start concurrent download",
        "download",
      );
      return undefined;
    }

    try {
      // Set global state first
      globalDownloadState.isDownloading = true;
      globalDownloadState.currentApp = name;

      // Update local state
      setIsLoading(true);
      setCurrentDownload(name);

      if (showHudMessages) {
        await showHUD(`Downloading ${name}...`, { clearRootSearch: true });
      }

      const filePath = await downloadIPA(bundleId, name, version, price);

      if (filePath) {
        // Verify file actually exists before showing success
        const fs = await import("fs");
        if (fs.existsSync(filePath)) {
          if (showHudMessages) {
            await showHUD("Download complete", { clearRootSearch: true });
          }

          showToast(Toast.Style.Success, "Download Complete", `${name} saved to ${filePath}`);

          return filePath;
        } else {
          // File path returned but file doesn't exist
          if (showHudMessages) {
            await showHUD("Download failed", { clearRootSearch: true });
          }

          await handleDownloadError(
            new Error(`File not found at expected path: ${filePath}`),
            "verify downloaded file",
            "download",
          );
          return undefined;
        }
      } else {
        if (showHudMessages) {
          await showHUD("Download failed", { clearRootSearch: true });
        }

        await handleDownloadError(new Error("Could not determine file path"), "determine file path", "download");
        return undefined;
      }
    } catch (error) {
      if (showHudMessages) {
        await showHUD("Download failed", { clearRootSearch: true });
      }

      await handleDownloadError(error instanceof Error ? error : new Error(String(error)), "download app", "download");

      return undefined;
    } finally {
      // Clear global state first
      globalDownloadState.isDownloading = false;
      globalDownloadState.currentApp = null;

      // Update local state
      setIsLoading(false);
      setCurrentDownload(null);
    }
  };

  return {
    downloadApp,
    isLoading,
    currentDownload,
  };
}
