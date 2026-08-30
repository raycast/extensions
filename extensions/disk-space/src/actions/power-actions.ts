import {
  Clipboard,
  open,
  showToast,
  Toast,
  confirmAlert,
  Alert,
} from "@raycast/api";
import { spawn } from "child_process";
import { StorageDrive } from "../types/storage";
import { formatBytes, formatPercent } from "../utils/formatters";
import { getStorageProvider } from "../services/storage-factory";

/**
 * Opens the root folder of a drive in Windows File Explorer or macOS Finder.
 */
export async function openDriveRoot(mountPoint: string): Promise<void> {
  const cleanPath = mountPoint.trim();
  try {
    if (process.platform === "win32") {
      const child = spawn("explorer.exe", [cleanPath], {
        detached: true,
        stdio: "ignore",
      });
      child.on("error", (err) => {
        console.error("Failed to launch explorer.exe:", err);
      });
      child.unref();
      await showToast({
        style: Toast.Style.Success,
        title: "Opening File Explorer",
        message: cleanPath,
      });
    } else {
      await open(cleanPath);
      await showToast({
        style: Toast.Style.Success,
        title: "Opening in Finder",
        message: cleanPath,
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open folder",
      message: (error as Error).message,
    });
  }
}

/**
 * Spawns Windows Terminal (wt.exe) / PowerShell or macOS Terminal at the drive root path.
 * Uses direct argument passing to avoid shell interpretation vulnerabilities.
 */
export async function openInTerminal(drivePath: string): Promise<void> {
  const cleanPath = drivePath.trim();
  try {
    if (process.platform === "win32") {
      // Try Windows Terminal first, fallback safely to PowerShell if wt is missing
      const wtProc = spawn("wt.exe", ["-d", cleanPath], {
        detached: true,
        stdio: "ignore",
      });
      wtProc.on("error", () => {
        const psProc = spawn(
          "powershell.exe",
          ["-NoExit", "-Command", `Set-Location -LiteralPath '${cleanPath}'`],
          {
            detached: true,
            stdio: "ignore",
          },
        );
        psProc.on("error", (psErr) => {
          console.error("Failed to launch PowerShell:", psErr);
        });
        psProc.unref();
      });
      wtProc.unref();
      await showToast({
        style: Toast.Style.Success,
        title: "Terminal Opened",
        message: cleanPath,
      });
    } else if (process.platform === "darwin") {
      const child = spawn("open", ["-a", "Terminal", cleanPath], {
        detached: true,
        stdio: "ignore",
      });
      child.on("error", (err) => {
        console.error("Failed to launch macOS Terminal:", err);
      });
      child.unref();
      await showToast({
        style: Toast.Style.Success,
        title: "Terminal Opened",
        message: cleanPath,
      });
    } else {
      await open(cleanPath);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Terminal",
      message: (error as Error).message,
    });
  }
}

/**
 * Launches Windows Disk Cleanup utility (cleanmgr.exe /d <Letter>) or macOS Storage Management.
 */
export async function launchDiskCleanup(driveLetter?: string): Promise<void> {
  try {
    if (process.platform === "win32") {
      const letter = driveLetter
        ? driveLetter.replace(/[^a-zA-Z]/g, "").toUpperCase()
        : "C";
      const cleanProc = spawn("cleanmgr.exe", ["/d", letter], {
        detached: true,
        stdio: "ignore",
      });
      cleanProc.on("error", (err) => {
        console.error("Failed to launch cleanmgr.exe:", err);
      });
      cleanProc.unref();
      await showToast({
        style: Toast.Style.Success,
        title: "Launching Windows Disk Cleanup",
        message: `Targeting Drive (${letter}:)`,
      });
    } else if (process.platform === "darwin") {
      const child = spawn("open", ["-b", "com.apple.StorageManagement"], {
        detached: true,
        stdio: "ignore",
      });
      child.on("error", (err) => {
        console.error("Failed to open macOS StorageManagement:", err);
      });
      child.unref();
      await showToast({
        style: Toast.Style.Success,
        title: "Opening macOS Storage Management",
      });
    } else {
      await showToast({
        style: Toast.Style.Animated,
        title: "Disk cleanup is only supported on Windows/macOS",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to launch Disk Cleanup",
      message: (error as Error).message,
    });
  }
}

/**
 * Launches Windows Storage Sense / Storage Settings or macOS System Settings.
 */
export async function openStorageSense(): Promise<void> {
  try {
    if (process.platform === "win32") {
      await open("ms-settings:storagesense");
      await showToast({
        style: Toast.Style.Success,
        title: "Opening Windows Storage Sense",
        message: "Settings > System > Storage",
      });
    } else if (process.platform === "darwin") {
      await open("x-apple.systempreferences:com.apple.preferences.storage");
      await showToast({
        style: Toast.Style.Success,
        title: "Opening macOS Storage Settings",
      });
    } else {
      await showToast({
        style: Toast.Style.Animated,
        title: "Storage Settings not supported on this platform",
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open Storage Settings",
      message: (error as Error).message,
    });
  }
}

/**
 * Safely unmounts and ejects a removable USB drive with user confirmation.
 */
export async function safelyEjectDrive(
  drive: StorageDrive,
  onEjected?: () => void,
): Promise<void> {
  if (drive.isSystemDrive) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Action Blocked",
      message: "System drive cannot be ejected.",
    });
    return;
  }

  const confirmed = await confirmAlert({
    title: `Safely Eject ${drive.displayName}?`,
    message: `Are you sure you want to unmount and disconnect ${drive.volumeName || drive.mountPoint}? All active transfers will stop.`,
    primaryAction: {
      title: "Eject Drive",
      style: Alert.ActionStyle.Destructive,
    },
    dismissAction: {
      title: "Cancel",
    },
  });

  if (!confirmed) {
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Ejecting Drive...",
    message: drive.displayName,
  });

  try {
    const provider = getStorageProvider();
    if (!provider.ejectDrive) {
      throw new Error(`Ejection is not supported on ${provider.platformName}`);
    }

    const success = await provider.ejectDrive(drive);
    if (success) {
      toast.style = Toast.Style.Success;
      toast.title = "Safe to Remove Hardware";
      toast.message = `${drive.displayName} was safely ejected.`;
      onEjected?.();
    } else {
      toast.style = Toast.Style.Failure;
      toast.title = "Ejection Unsuccessful";
      toast.message = `Could not eject ${drive.displayName}. The drive may be in use by another process.`;
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Ejection Error";
    toast.message = (error as Error).message;
  }
}

/**
 * Copies a human-readable drive summary to the clipboard.
 */
export async function copyDriveSummary(drive: StorageDrive): Promise<void> {
  const lines = [
    `Drive: ${drive.displayName}`,
    `Mount Point: ${drive.mountPoint}`,
    `Type: ${drive.driveTypeDescription} (${drive.fileSystem})`,
    `Capacity: ${formatBytes(drive.usedBytes)} used of ${formatBytes(drive.totalBytes)} (${formatPercent(drive.usagePercent)})`,
    `Free Space: ${formatBytes(drive.freeBytes)} free`,
    `Health Status: ${drive.healthStatus}`,
    drive.busType ? `Bus Interface: ${drive.busType}` : null,
    drive.model ? `Model: ${drive.model}` : null,
    drive.networkPath ? `Network Path: ${drive.networkPath}` : null,
    drive.isBitLockerEncrypted ? "BitLocker Encryption: Enabled" : null,
  ].filter(Boolean);

  const text = lines.join("\n");
  await Clipboard.copy(text);
  await showToast({
    style: Toast.Style.Success,
    title: "Copied Summary to Clipboard",
    message: `${drive.displayName} overview`,
  });
}

/**
 * Copies the raw JSON metadata of a drive to the clipboard.
 */
export async function copyDriveJson(drive: StorageDrive): Promise<void> {
  const json = JSON.stringify(drive, null, 2);
  await Clipboard.copy(json);
  await showToast({
    style: Toast.Style.Success,
    title: "Copied JSON to Clipboard",
    message: `${drive.displayName} metadata`,
  });
}
