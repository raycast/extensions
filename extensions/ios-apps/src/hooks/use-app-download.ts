import { useState } from "react";
import { showToast, Toast, showHUD } from "@raycast/api";
import { downloadIPA } from "../ipatool";

/**
 * Hook for downloading an app
 * @returns Object with download function and loading state
 */
export function useAppDownload() {
  const [isLoading, setIsLoading] = useState(false);

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
    try {
      setIsLoading(true);

      if (showHudMessages) {
        await showHUD(`Downloading ${name}...`, { clearRootSearch: true });
      }

      const filePath = await downloadIPA(bundleId, name, version, price);

      if (filePath) {
        if (showHudMessages) {
          await showHUD("Download complete", { clearRootSearch: true });
        }

        showToast(Toast.Style.Success, "Download Complete", `${name} saved to ${filePath}`);

        return filePath;
      } else {
        if (showHudMessages) {
          await showHUD("Download failed", { clearRootSearch: true });
        }

        showToast(Toast.Style.Failure, "Download Failed", "Could not determine file path");
        return undefined;
      }
    } catch (error) {
      if (showHudMessages) {
        await showHUD("Download failed", { clearRootSearch: true });
      }

      showToast(
        Toast.Style.Failure,
        "Download Failed",
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      );

      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    downloadApp,
    isLoading,
  };
}
