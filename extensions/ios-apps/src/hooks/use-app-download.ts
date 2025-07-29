import { useState } from "react";
import { showToast, Toast, showHUD } from "@raycast/api";
import { downloadApp } from "../ipatool";
import { handleDownloadError, handleAuthError } from "../utils/error-handler";
import { analyzeIpatoolError } from "../utils/ipatool-error-patterns";
import { AuthNavigationHelpers } from "./useAuthNavigation";
import { NeedsLoginError, Needs2FAError, ensureAuthenticated } from "../utils/auth";

// Global download state to prevent concurrent downloads across all hook instances
const globalDownloadState = {
  isDownloading: false,
  currentApp: null as string | null,
};

/**
 * Hook for downloading an app
 * @param authNavigation Optional auth navigation helpers for form redirects
 * @returns Object with download function and loading state
 */
export function useAppDownload(authNavigation?: AuthNavigationHelpers) {
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
      // Check if this is a specific authentication error that should be handled by the form flow
      if (error instanceof NeedsLoginError || error instanceof Needs2FAError) {
        // Don't show failure toast for authentication errors
        // The form flow will handle these
        if (showHudMessages) {
          await showHUD("Authentication Required", { clearRootSearch: true });
        }

        // Store download parameters for retry after successful auth
        const downloadParams = { bundleId, name, version, price };

        if (authNavigation) {
          // Let the form flow handle authentication
          if (error instanceof NeedsLoginError) {
            authNavigation.pushLoginForm?.(async () => {
              // After successful login, resume download
              try {
                await ensureAuthenticated();
                await showToast({ style: Toast.Style.Animated, title: "Resuming download..." });
                await handleDownload(
                  downloadParams.bundleId,
                  downloadParams.name,
                  downloadParams.version,
                  downloadParams.price,
                  showHudMessages,
                );
              } catch (authError) {
                // If auth still fails, let it propagate
                console.error("Authentication failed after login:", authError);
              }
            });
          } else if (error instanceof Needs2FAError) {
            authNavigation.push2FAForm?.("session-token", async () => {
              // After successful 2FA, resume download
              try {
                await ensureAuthenticated();
                await showToast({ style: Toast.Style.Animated, title: "Resuming download..." });
                await handleDownload(
                  downloadParams.bundleId,
                  downloadParams.name,
                  downloadParams.version,
                  downloadParams.price,
                  showHudMessages,
                );
              } catch (authError) {
                // If auth still fails, let it propagate
                console.error("Authentication failed after 2FA:", authError);
              }
            });
          }
        } else {
          // No navigation available, show preferences option
          await handleAuthError(error, false, true);
        }

        return undefined;
      }

      // For other errors, use the existing error analysis
      const errorMessage = error instanceof Error ? error.message : String(error);
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

      // For non-specific auth errors, use the existing handler
      if (errorAnalysis.isAuthError && !(error instanceof NeedsLoginError) && !(error instanceof Needs2FAError)) {
        // Store download parameters for retry after successful auth
        const downloadParams = { bundleId, name, version, price };

        // Handle authentication errors with form redirect if available
        await handleAuthError(
          new Error(errorAnalysis.userMessage),
          false,
          !authNavigation, // Only show preferences if no navigation available
          undefined,
          authNavigation?.pushLoginForm,
          authNavigation?.push2FAForm,
          async () => {
            // Resume download after successful authentication
            await showToast({ style: Toast.Style.Animated, title: "Resuming download..." });
            await handleDownload(
              downloadParams.bundleId,
              downloadParams.name,
              downloadParams.version,
              downloadParams.price,
              showHudMessages,
            );
          },
        );
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
