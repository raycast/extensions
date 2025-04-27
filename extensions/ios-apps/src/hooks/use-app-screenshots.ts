import { useState, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { AppDetails } from "../types";
import { downloadScreenshots } from "../utils/itunes-api";

/**
 * Interface for the screenshot download state
 */
export interface ScreenshotDownloadState {
  isLoading: boolean;
  error: Error | null;
  downloadPath: string | null;
}

/**
 * React hook for downloading app screenshots
 * @returns A hook with state and download function
 */
export function useAppScreenshots() {
  const [state, setState] = useState<ScreenshotDownloadState>({
    isLoading: false,
    error: null,
    downloadPath: null,
  });

  /**
   * Download screenshots for an app
   * @param app The app details object
   * @returns Path to the downloaded screenshots directory or null if failed
   */
  const downloadAppScreenshots = useCallback(async (app: AppDetails): Promise<string | null> => {
    // Reset state
    setState({
      isLoading: true,
      error: null,
      downloadPath: null,
    });

    try {
      // Use the downloadScreenshots function from itunes-api.ts
      const downloadPath = await downloadScreenshots(app.bundleId, app.name, app.version, app.price);

      if (downloadPath) {
        setState({
          isLoading: false,
          error: null,
          downloadPath,
        });
        return downloadPath;
      } else {
        throw new Error("Failed to download screenshots");
      }
    } catch (error) {
      console.error("Error in useAppScreenshots hook:", error);
      setState({
        isLoading: false,
        error: error instanceof Error ? error : new Error(String(error)),
        downloadPath: null,
      });
      await showToast(Toast.Style.Failure, "Failed to download screenshots", String(error));
      return null;
    }
  }, []);

  return {
    ...state,
    downloadAppScreenshots,
  };
}
