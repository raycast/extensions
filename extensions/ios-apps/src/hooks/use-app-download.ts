import { useState } from "react";
import { showToast, Toast, showHUD } from "@raycast/api";
import { downloadApp } from "../ipatool";
import { handleDownloadError, handleAuthError } from "../utils/error-handler";
import { analyzeIpatoolError } from "../utils/ipatool-error-patterns";
import { AuthNavigationHelpers } from "./useAuthNavigation";
import { NeedsLoginError, Needs2FAError, ensureAuthenticated } from "../utils/auth";
import { logger } from "../utils/logger";

// Global download state to prevent concurrent downloads across all hook instances
const globalDownloadState = {
  isAuthenticating: false,
  isDownloading: false,
  currentApp: null as string | null,
  activeOpId: null as string | null,
};

/**
 * Hook for downloading an app
 * @param authNavigation Optional auth navigation helpers for form redirects
 * @returns Object with download function and loading state
 */
export function useAppDownload(authNavigation?: AuthNavigationHelpers) {
  const [isLoading, setIsLoading] = useState(globalDownloadState.isDownloading || globalDownloadState.isAuthenticating);
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
    opId?: string,
  ): Promise<string | null | undefined> => {
    // Generate or reuse an operation ID for this logical download flow
    const operationId = opId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Concurrency gate: block other requests while authenticating or downloading
    if (globalDownloadState.activeOpId && globalDownloadState.activeOpId !== operationId) {
      if (globalDownloadState.isAuthenticating) {
        logger.log(
          `[useAppDownload] Authentication in progress for ${globalDownloadState.currentApp}. Blocking new request for ${name}.`,
        );
        // Avoid showing HUD/toast here to prevent premature window closure or noisy errors
        return undefined;
      }
      if (globalDownloadState.isDownloading) {
        logger.log(
          `[useAppDownload] Download in progress for ${globalDownloadState.currentApp}. Blocking new request for ${name}.`,
        );
        return undefined;
      }
    }

    // Acquire lock if this is a new operation
    if (!globalDownloadState.activeOpId) {
      globalDownloadState.activeOpId = operationId;
      globalDownloadState.currentApp = name;
      globalDownloadState.isAuthenticating = true;
    }

    // Update local state
    setIsLoading(true);
    setCurrentDownload(name);

    let releaseLock = true;

    try {
      // Pre-authenticate first so we can push forms without closing the window
      logger.log(
        `[useAppDownload] Pre-authentication start for ${name} (${bundleId}) – showHudMessages=${showHudMessages}`,
      );
      try {
        await ensureAuthenticated();
        logger.log(`[useAppDownload] Pre-authentication OK for ${name} (${bundleId})`);
        // Transition to downloading phase for this operation
        if (globalDownloadState.activeOpId === operationId) {
          globalDownloadState.isAuthenticating = false;
          globalDownloadState.isDownloading = true;
        }
      } catch (error) {
        if (error instanceof NeedsLoginError || error instanceof Needs2FAError) {
          logger.log(
            `[useAppDownload] Pre-authentication indicates auth required (${error instanceof NeedsLoginError ? "login" : "2FA"}). Suppressing HUD and pushing form inline.`,
          );

          const downloadParams = { bundleId, name, version, price };
          if (authNavigation) {
            // Keep the global lock while we wait for the inline auth flow to complete
            releaseLock = false;
            if (error instanceof NeedsLoginError) {
              logger.log(`[useAppDownload] Pushing Login form for ${name} (${bundleId})`);
              authNavigation.pushLoginForm?.(async () => {
                try {
                  logger.log(`[useAppDownload] Login callback invoked. Re-checking auth...`);
                  await ensureAuthenticated();
                  logger.log(`[useAppDownload] Auth OK after login. Resuming download for ${name} (${bundleId})`);
                  await showToast({ style: Toast.Style.Animated, title: "Resuming download..." });
                  await handleDownload(
                    downloadParams.bundleId,
                    downloadParams.name,
                    downloadParams.version,
                    downloadParams.price,
                    showHudMessages,
                    operationId,
                  );
                } catch (authError) {
                  const msg = authError instanceof Error ? authError.message : String(authError);
                  const info = analyzeIpatoolError(msg);
                  if (info.isAuthError) {
                    logger.error(`[useAppDownload] Authentication failed after login:`, authError);
                  } else {
                    logger.error(`[useAppDownload] Download retry after login failed:`, authError);
                  }
                }
              });
            } else if (error instanceof Needs2FAError) {
              logger.log(`[useAppDownload] Pushing 2FA form for ${name} (${bundleId})`);
              authNavigation.push2FAForm?.(async () => {
                try {
                  logger.log(`[useAppDownload] 2FA callback invoked. Re-checking auth...`);
                  await ensureAuthenticated();
                  logger.log(`[useAppDownload] Auth OK after 2FA. Resuming download for ${name} (${bundleId})`);
                  await showToast({ style: Toast.Style.Animated, title: "Resuming download..." });
                  await handleDownload(
                    downloadParams.bundleId,
                    downloadParams.name,
                    downloadParams.version,
                    downloadParams.price,
                    showHudMessages,
                    operationId,
                  );
                } catch (authError) {
                  const msg = authError instanceof Error ? authError.message : String(authError);
                  const info = analyzeIpatoolError(msg);
                  if (info.isAuthError) {
                    logger.error(`[useAppDownload] Authentication failed after 2FA:`, authError);
                  } else {
                    logger.error(`[useAppDownload] Download retry after 2FA failed:`, authError);
                  }
                }
              });
            }
          } else {
            // No navigation available; fall back to preferences
            logger.log(
              `[useAppDownload] No authNavigation available. Delegating to handleAuthError with preferences option.`,
            );
            await handleAuthError(error, false, true);
          }

          return undefined;
        }
        // Non-auth errors: rethrow to be handled below
        throw error;
      }

      if (showHudMessages) {
        if (authNavigation) {
          logger.log(
            `[useAppDownload] Showing Toast (animated): "Downloading ${name}..." (avoid HUD to keep view open)`,
          );
          await showToast({ style: Toast.Style.Animated, title: `Downloading ${name}...` });
        } else {
          logger.log(`[useAppDownload] Showing HUD: "Downloading ${name}..."`);
          await showHUD(`Downloading ${name}...`);
        }
      }

      const filePath = await downloadApp(bundleId, name, version, price, 0, undefined, {
        suppressHUD: Boolean(authNavigation),
      });

      if (filePath) {
        // Verify file actually exists before showing success
        const fs = await import("fs");
        if (fs.existsSync(filePath)) {
          if (showHudMessages && !authNavigation) {
            logger.log(`[useAppDownload] Showing HUD: "Download Complete" for ${name}`);
            await showHUD("Download Complete");
          }

          logger.log(`[useAppDownload] File exists. Success toast for ${name} at ${filePath}`);
          showToast(Toast.Style.Success, "Download Complete", `${name} saved to ${filePath}`);

          return filePath;
        } else {
          // File path returned but file doesn't exist
          if (showHudMessages && !authNavigation) {
            logger.log(`[useAppDownload] Showing HUD: "Download Failed" (file missing) for ${name}`);
            await showHUD("Download Failed");
          }

          await handleDownloadError(
            new Error(`File not found at expected path: ${filePath}`),
            "verify downloaded file",
            "download",
          );
          return undefined;
        }
      } else if (filePath === null) {
        // User cancelled (e.g., existing file) – already shown an informational toast in validation flow.
        logger.log(
          `[useAppDownload] Download cancelled by user for ${name} (${bundleId}). Suppressing failure HUD/toast.`,
        );
        return null;
      } else {
        if (showHudMessages && !authNavigation) {
          logger.log(`[useAppDownload] Showing HUD: "Download Failed" (no file path) for ${name}`);
          await showHUD("Download Failed");
        }

        await handleDownloadError(new Error("Could not determine file path"), "determine file path", "download");
        return undefined;
      }
    } catch (error) {
      // Check if this is a specific authentication error that should be handled by the form flow
      if (error instanceof NeedsLoginError || error instanceof Needs2FAError) {
        // Don't show failure toast for authentication errors
        // The form flow will handle these
        logger.log(
          `[useAppDownload] Caught auth error in main catch (${error instanceof NeedsLoginError ? "login" : "2FA"}). Suppressing HUD and delegating to form flow.`,
        );

        // Store download parameters for retry after successful auth
        const downloadParams = { bundleId, name, version, price };
        if (authNavigation) {
          // Keep the lock while waiting for inline auth flow
          releaseLock = false;
          // Let the form flow handle authentication
          if (error instanceof NeedsLoginError) {
            logger.log(`[useAppDownload] Pushing Login form (catch) for ${name} (${bundleId})`);
            authNavigation.pushLoginForm?.(async () => {
              // After successful login, resume download
              try {
                logger.log(`[useAppDownload] Login callback (catch) invoked. Re-checking auth...`);
                await ensureAuthenticated();
                logger.log(`[useAppDownload] Auth OK after login (catch). Resuming download for ${name} (${bundleId})`);
                await showToast({ style: Toast.Style.Animated, title: "Resuming download..." });
                await handleDownload(
                  downloadParams.bundleId,
                  downloadParams.name,
                  downloadParams.version,
                  downloadParams.price,
                  showHudMessages,
                  operationId,
                );
              } catch (authError) {
                const msg = authError instanceof Error ? authError.message : String(authError);
                const info = analyzeIpatoolError(msg);
                if (info.isAuthError) {
                  logger.error(`[useAppDownload] Authentication failed after login (catch):`, authError);
                } else {
                  logger.error(`[useAppDownload] Download retry after login failed (catch):`, authError);
                }
              }
            });
          } else if (error instanceof Needs2FAError) {
            logger.log(`[useAppDownload] Pushing 2FA form (catch) for ${name} (${bundleId})`);
            authNavigation.push2FAForm?.(async () => {
              // After successful 2FA, resume download
              try {
                logger.log(`[useAppDownload] 2FA callback (catch) invoked. Re-checking auth...`);
                await ensureAuthenticated();
                logger.log(`[useAppDownload] Auth OK after 2FA (catch). Resuming download for ${name} (${bundleId})`);
                await showToast({ style: Toast.Style.Animated, title: "Resuming download..." });
                await handleDownload(
                  downloadParams.bundleId,
                  downloadParams.name,
                  downloadParams.version,
                  downloadParams.price,
                  showHudMessages,
                  operationId,
                );
              } catch (authError) {
                const msg = authError instanceof Error ? authError.message : String(authError);
                const info = analyzeIpatoolError(msg);
                if (info.isAuthError) {
                  logger.error(`[useAppDownload] Authentication failed after 2FA (catch):`, authError);
                } else {
                  logger.error(`[useAppDownload] Download retry after 2FA failed (catch):`, authError);
                }
              }
            });
          }
        } else {
          // No navigation available, show preferences option
          logger.log(
            `[useAppDownload] No authNavigation available (catch). Delegating to handleAuthError with preferences option.`,
          );
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
              : errorAnalysis.errorType === "rate_limited"
                ? "Rate Limited"
                : errorAnalysis.errorType === "maintenance"
                  ? "App Store Maintenance"
                  : errorAnalysis.errorType === "regional_restriction"
                    ? "Region Restricted"
                    : errorAnalysis.errorType === "account_restriction"
                      ? "Account Restricted"
                      : "Download Failed";
        if (authNavigation) {
          // Avoid HUD to keep the view open; dedicated error handlers will show toasts
          logger.log(`[useAppDownload] Skipping HUD (view context). Would show: "${hudMessage}" for ${name}`);
        } else {
          logger.log(`[useAppDownload] Showing HUD: "${hudMessage}" for ${name}`);
          await showHUD(hudMessage);
        }
      }

      // For non-specific auth errors, use the existing handler
      if (errorAnalysis.isAuthError && !(error instanceof NeedsLoginError) && !(error instanceof Needs2FAError)) {
        // Store download parameters for retry after successful auth
        const downloadParams = { bundleId, name, version, price };

        // Handle authentication errors with form redirect if available
        logger.log(
          `[useAppDownload] Non-specific auth error detected. Routing via handleAuthError with potential form navigation.`,
        );
        // Keep the global lock while waiting for inline auth flow via handler
        if (authNavigation) {
          releaseLock = false;
        }
        await handleAuthError(
          new Error(errorAnalysis.userMessage),
          false,
          !authNavigation, // Only show preferences if no navigation available
          undefined,
          authNavigation?.pushLoginForm,
          authNavigation?.push2FAForm,
          async () => {
            // Resume download after successful authentication
            logger.log(`[useAppDownload] Auth success via handler. Resuming download for ${name} (${bundleId})`);
            await showToast({ style: Toast.Style.Animated, title: "Resuming download..." });
            await handleDownload(
              downloadParams.bundleId,
              downloadParams.name,
              downloadParams.version,
              downloadParams.price,
              showHudMessages,
              operationId,
            );
          },
        );
      } else {
        // Handle general download errors with specific user message
        logger.log(
          `[useAppDownload] General download error handled. userMessage="${errorAnalysis.userMessage}" type=${errorAnalysis.errorType}`,
        );
        await handleDownloadError(new Error(errorAnalysis.userMessage), "download app", "download");
      }

      return undefined;
    } finally {
      logger.log(`[useAppDownload] Cleaning up global/local download state for ${name} (${bundleId})`);
      // Release the global lock only if this operation owns it and we're not waiting on auth UI
      if (globalDownloadState.activeOpId === operationId && releaseLock) {
        globalDownloadState.isAuthenticating = false;
        globalDownloadState.isDownloading = false;
        globalDownloadState.currentApp = null;
        globalDownloadState.activeOpId = null;
      }

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
