import { platform } from "node:os";
import { confirmAlert, open, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef } from "react";
import type { DependencyStatus } from "../types";
import { depsLogger } from "../utils/logger";
import { checkAllDependencies, installQmd, installSqlite } from "../utils/qmd";

interface UseDependencyCheckResult {
  isLoading: boolean;
  isReady: boolean;
  status: DependencyStatus | null;
  recheckDependencies: () => void;
}

async function checkDependencies(): Promise<DependencyStatus> {
  depsLogger.debug("Checking all dependencies");
  const status = await checkAllDependencies();
  depsLogger.debug("Dependency check complete", status);
  return status;
}

export function useDependencyCheck(): UseDependencyCheckResult {
  const invalidPathShownRef = useRef(false); // gates the invalid-path toast (once per mount)
  const installPromptShownRef = useRef(false); // gates the install prompts (once per mount)

  const {
    data: status,
    isLoading,
    revalidate,
  } = useCachedPromise(checkDependencies, [], {
    keepPreviousData: true,
  });

  const isReady = Boolean(status?.qmdInstalled && status?.sqliteInstalled);

  // Show prompts/toasts for dependency issues (each guarded to fire only once per mount)
  useEffect(() => {
    if (isLoading || !status) {
      return;
    }

    // Warn about invalid custom paths once per mount, even when extension is ready
    if (status.invalidCustomPaths?.length && !invalidPathShownRef.current) {
      invalidPathShownRef.current = true;
      depsLogger.warn("Invalid custom paths", { paths: status.invalidCustomPaths });
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid custom path",
        message: `${status.invalidCustomPaths.join(", ")} — check Extension Settings`,
      });
    }

    if (isReady || installPromptShownRef.current) {
      return; // All deps installed, or install prompts already shown
    }

    installPromptShownRef.current = true;

    const promptForMissing = async () => {
      if (!status.qmdInstalled) {
        depsLogger.warn("QMD not installed");
        if (!status.bunInstalled) {
          // Bun is needed to install qmd via the built-in installer
          depsLogger.warn("Bun not installed");
          await promptBunInstall();
          return;
        }
        await promptQmdInstall(revalidate);
        return;
      }
      if (!status.sqliteInstalled && platform() === "darwin") {
        depsLogger.warn("SQLite not installed");
        await promptSqliteInstall(revalidate);
      }
    };

    promptForMissing();
  }, [status, isLoading, isReady, revalidate]);

  return {
    isLoading: isLoading && !status, // Only loading if no cached data
    isReady,
    status: status ?? null,
    recheckDependencies: revalidate,
  };
}

async function promptBunInstall() {
  await confirmAlert({
    title: "Bun Not Installed",
    message: "QMD requires Bun. Would you like to visit the installation page?",
    primaryAction: {
      title: "Open Installation Page",
      onAction: () => open("https://bun.sh"),
    },
  });
}

async function promptQmdInstall(revalidate: () => void) {
  const shouldInstall = await confirmAlert({
    title: "QMD Not Installed",
    message: "Would you like to install QMD now?",
    primaryAction: { title: "Install QMD" },
  });

  if (shouldInstall) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing QMD...",
    });

    const result = await installQmd();
    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "QMD Installed";
      revalidate();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation Failed";
      toast.message = result.error;
    }
  }
}

async function promptSqliteInstall(revalidate: () => void) {
  const shouldInstall = await confirmAlert({
    title: "SQLite Not Installed",
    message: "QMD requires SQLite. Install via Homebrew?",
    primaryAction: { title: "Install SQLite" },
  });

  if (shouldInstall) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing SQLite...",
    });

    const result = await installSqlite();
    if (result.success) {
      toast.style = Toast.Style.Success;
      toast.title = "SQLite Installed";
      revalidate();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Installation Failed";
      toast.message = result.error;
    }
  }
}
