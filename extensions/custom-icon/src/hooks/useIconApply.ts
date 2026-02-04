import { showToast, Toast, environment, popToRoot, trash } from "@raycast/api";
import { useExec } from "@raycast/utils";
import { useState, useEffect, useCallback } from "react";
import { join } from "path";

export interface ApplyIconParams {
  appPath: string;
  iconPath: string;
  restartApp: boolean;
  /** If provided, uses this processed icon path instead of iconPath */
  processedIconPath?: string;
}

/**
 * Custom hook to handle icon application via shell script.
 * Encapsulates execution state, cleanup, and error handling.
 */
export function useIconApply() {
  const [appPath, setAppPath] = useState("");
  const [iconPath, setIconPath] = useState("");
  const [shouldRestart, setShouldRestart] = useState(false);
  const [shouldExecute, setShouldExecute] = useState(false);
  const [processedIconPath, setProcessedIconPath] = useState<string | null>(null);

  const scriptPath = join(environment.assetsPath, "replace_icon.sh");
  const effectiveIconPath = processedIconPath || iconPath;

  // Build command arguments
  const baseArgs = ["-a", appPath, "-i", effectiveIconPath];
  const args = shouldRestart ? [...baseArgs, "--restart"] : baseArgs;

  /**
   * Cleanup temporary processed icon file
   */
  const cleanup = useCallback(async () => {
    if (processedIconPath) {
      try {
        await trash(processedIconPath);
      } catch {
        if (environment.isDevelopment) {
          console.warn("Cleanup failed: ", error);
        }
      }
      setProcessedIconPath(null);
    }
  }, [processedIconPath]);

  /**
   * Reset execution state after completion or error
   */
  const resetState = useCallback(() => {
    setShouldExecute(false);
    cleanup();
  }, [cleanup]);

  const { isLoading, error } = useExec(scriptPath, args, {
    execute: shouldExecute && appPath.length > 0 && effectiveIconPath.length > 0,
    timeout: 30000, // 30 seconds timeout for large images
    onError: (err) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to change icon",
        message: err.message,
      });
      resetState();
    },
    onData: (output) => {
      showToast({
        style: Toast.Style.Success,
        title: "Icon changed successfully",
        message: output.trim(),
      });
      resetState();
      popToRoot();
    },
    failureToastOptions: {
      title: "Icon operation failed",
    },
  });

  // Handle errors that weren't caught by onError
  useEffect(() => {
    if (error && shouldExecute) {
      resetState();
    }
  }, [error, shouldExecute, resetState]);

  /**
   * Apply an icon to the target app/file/folder.
   * Shows a loading toast and triggers the shell script execution.
   */
  const applyIcon = useCallback(
    async ({
      appPath: targetPath,
      iconPath: targetIconPath,
      restartApp,
      processedIconPath: processed,
    }: ApplyIconParams) => {
      await showToast({
        style: Toast.Style.Animated,
        title: "Applying custom icon...",
      });

      setAppPath(targetPath);
      setShouldRestart(restartApp);

      if (processed) {
        setProcessedIconPath(processed);
      } else {
        setIconPath(targetIconPath);
      }

      setShouldExecute(true);
    },
    [],
  );

  return {
    /** Whether the icon application is in progress */
    isLoading,
    /** Apply an icon to the target */
    applyIcon,
  };
}
