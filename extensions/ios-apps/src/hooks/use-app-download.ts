import { useState } from "react";
import { showToast, Toast, showHUD } from "@raycast/api";
import { downloadApp } from "../ipatool";
import { handleDownloadError, handleAuthError } from "../utils/error-handler";
import { analyzeIpatoolError } from "../utils/ipatool-error-patterns";

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
  const handleDownload = async (
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

      const filePath = await downloadApp(bundleId, name, version, price);

      if (filePath) {
        // Verify file actually exists before showing success
        const fs = await import("fs");
        if (fs.existsSync(filePath)) {
          if (showHudMessages) {
            await showHUD("Download Complete", { clearRootSearch: true });
          }

          showToast(Toast.Style.Success, "Download Complete", `${name} saved to ${filePath}`);

          return filePath;
        } else {
          // File path returned but file doesn't exist
          if (showHudMessages) {
            await showHUD("Download Failed", { clearRootSearch: true });
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
          await showHUD("Download Failed", { clearRootSearch: true });
        }

        await handleDownloadError(new Error("Could not determine file path"), "determine file path", "download");
        return undefined;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Use precise ipatool error analysis instead of generic pattern matching
      const errorAnalysis = analyzeIpatoolError(errorMessage);

      if (showHudMessages) {
        const hudMessage = errorAnalysis.isAuthError
          ? "Authentication Failed"
          : errorAnalysis.errorType === "network"
            ? "Network Error"
            : errorAnalysis.errorType === "app_not_found"
              ? "App Not Found"
              : "Download Failed";
        await showHUD(hudMessage, { clearRootSearch: true });
      }

      if (errorAnalysis.isAuthError) {
        // Handle authentication errors with preferences redirect
        await handleAuthError(new Error(errorAnalysis.userMessage), false);
      } else {
        // Handle general download errors with specific user message
        await handleDownloadError(new Error(errorAnalysis.userMessage), "download app", "download");
      }

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
    downloadApp: handleDownload,
    isLoading,
    currentDownload,
  };
}
