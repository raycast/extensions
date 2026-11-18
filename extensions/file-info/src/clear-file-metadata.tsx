import { getSelectedFinderItems, showToast, Toast, confirmAlert, Alert, Clipboard, open } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";
import { utimes } from "fs/promises";
import * as path from "path";

const execFilePromise = promisify(execFile);

async function getExifToolPath(): Promise<string | null> {
  const commonPaths = [
    "/usr/local/bin/exiftool",
    "/opt/homebrew/bin/exiftool",
    "/usr/bin/exiftool",
    process.platform === "win32" ? "C:\\Program Files\\ExifTool\\exiftool.exe" : null,
  ].filter((p): p is string => p !== null);

  for (const p of commonPaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  try {
    // If not found in common paths, check PATH
    await execFilePromise("exiftool", ["-ver"]);
    return "exiftool";
  } catch {
    return null;
  }
}

async function getBrewPath(): Promise<string | null> {
  const commonPaths = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew", "/homebrew/bin/brew"];
  for (const p of commonPaths) {
    if (existsSync(p)) return p;
  }
  try {
    await execFilePromise("brew", ["--version"]);
    return "brew";
  } catch {
    return null;
  }
}

async function isPackageManagerInstalled(): Promise<boolean> {
  if (process.platform === "win32") {
    const chocoPaths = ["C:\\ProgramData\\chocolatey\\bin\\choco.exe", "C:\\Program Files\\chocolatey\\bin\\choco.exe"];
    for (const p of chocoPaths) {
      if (existsSync(p)) return true;
    }
    try {
      await execFilePromise("choco", ["--version"]);
      return true;
    } catch {
      return false;
    }
  }

  return (await getBrewPath()) !== null;
}

async function installExifTool(): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      // On Windows, use choco if available
      try {
        await execFilePromise("choco", ["install", "exiftool", "-y"]);
        return true;
      } catch {
        // Fallback to manual if choco fails (or ask user to run command manually)
        return false;
      }
    } else {
      const brewPath = await getBrewPath();
      if (!brewPath) return false;

      // On macOS, run brew install
      // Note: This might fail if user doesn't have permissions or Xcode tools
      // Usually running in terminal is safer, but we can try
      await execFilePromise(brewPath, ["install", "exiftool"]);
      return true;
    }
  } catch (error) {
    console.error("Installation error:", error);
    return false;
  }
}

async function clearMacOSMetadata(file: string): Promise<void> {
  // Clear all extended attributes
  try {
    await execFilePromise("xattr", ["-c", file]);
  } catch {
    // Ignore if no xattrs
  }

  // Clear specific system attributes if they persist
  const attributesToRemove = [
    "com.apple.metadata:kMDItemFinderComment",
    "com.apple.quarantine",
    "com.apple.FinderInfo",
    "com.apple.ResourceFork",
  ];

  for (const attr of attributesToRemove) {
    try {
      await execFilePromise("xattr", ["-d", attr, file]);
    } catch {
      // Ignore if attribute doesn't exist
    }
  }

  // Clear resource fork
  try {
    await execFilePromise("rm", ["-f", `${file}/..namedfork/rsrc`]);
  } catch {
    // Ignore
  }

  // Clear file ownership (chown user file)
  try {
    const currentUser = process.env.USER || process.env.USERNAME;
    if (currentUser) {
      await execFilePromise("chown", [currentUser, file]);
    }
  } catch {
    // Ignore permission errors
  }
}

async function clearWindowsMetadata(file: string): Promise<void> {
  try {
    // Clear all metadata properties using PowerShell safely
    await execFilePromise("powershell", [
      "-NoProfile",
      "-Command",
      "Clear-ItemProperty",
      "-LiteralPath",
      file,
      "-Name",
      "*",
      "-ErrorAction",
      "SilentlyContinue",
    ]);
  } catch (e) {
    console.error("Failed to clear Windows attributes", e);
  }

  // Try to take ownership and set to current user
  try {
    const currentUser = process.env.USERNAME || "Everyone";
    // Using icacls directly instead of PowerShell to avoid injection
    await execFilePromise("takeown", ["/F", file, "/A"]);
    await execFilePromise("icacls", [file, "/setowner", currentUser, "/T"]);
  } catch {
    // Ignore permission errors
  }
}

export default async function Command() {
  try {
    const selectedItems = await getSelectedFinderItems();

    if (selectedItems.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No files selected",
        message: "Select a file in Finder to clear metadata",
      });
      return;
    }

    let exifToolPath = await getExifToolPath();

    // Check if ExifTool is installed
    if (!exifToolPath) {
      const hasPackageManager = await isPackageManagerInstalled();

      if (!hasPackageManager) {
        let title: string;
        let description: string;
        let url: string;

        if (process.platform === "win32") {
          url = "https://chocolatey.org/install";
          title = "Install Chocolatey";
          description = "Chocolatey helps us install the tools needed to clear file metadata.";
        } else {
          url = "https://brew.sh";
          title = "Install Homebrew";
          description = "Homebrew helps us install the tools needed to clear file metadata.";
        }

        const action = await confirmAlert({
          title: title,
          message: `${description}\n\nPlease install the package manager manually using the link below, then try again.`,
          primaryAction: {
            title: "Open Website",
            style: Alert.ActionStyle.Default,
          },
          dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
        });

        if (action) {
          await open(url);
        }
        return;
      }

      // Package manager is available, offer to install ExifTool
      const shouldInstall = await confirmAlert({
        title: "Installation Required",
        message: `We need to install 'exiftool' to clear file metadata. This will only take a moment.`,
        primaryAction: { title: "Install", style: Alert.ActionStyle.Default },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      });

      if (!shouldInstall) {
        return;
      }

      await showToast({
        style: Toast.Style.Animated,
        title: "Installing...",
        message: "This may take a minute",
      });

      const installSuccess = await installExifTool();

      if (!installSuccess) {
        // If automatic install fails, give manual command
        const manualCmd = process.platform === "win32" ? "choco install exiftool -y" : "brew install exiftool";

        const manualAction = await confirmAlert({
          title: "Installation Failed",
          message: "Automatic installation failed. Please run the command manually.",
          primaryAction: { title: "Copy Command", style: Alert.ActionStyle.Default },
          dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
        });

        if (manualAction) {
          await Clipboard.copy(manualCmd);
          await showToast({ style: Toast.Style.Success, title: "Command Copied" });
        }
        return;
      }

      // Verify installation
      exifToolPath = await getExifToolPath();
      if (!exifToolPath) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Installation Complete",
          message: "Please try again in a moment",
        });
        return;
      }
    }

    // Confirm deletion
    const confirmed = await confirmAlert({
      title: "Clear File Metadata",
      message: `This will permanently remove all metadata from the selected ${selectedItems.length === 1 ? "file" : "files"}. The file contents will remain unchanged.`,
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
    });

    if (!confirmed) {
      return;
    }

    await showToast({
      style: Toast.Style.Animated,
      title: "Clearing metadata...",
      message: `Processing ${selectedItems.length} ${selectedItems.length === 1 ? "file" : "files"}`,
    });

    let successCount = 0;
    let failureCount = 0;

    for (const item of selectedItems) {
      const file = item.path;
      const fileName = path.basename(file);

      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Clearing metadata...",
          message: `Processing: ${fileName}`,
        });

        // Step 1: System-specific metadata
        if (process.platform === "win32") {
          await clearWindowsMetadata(file);
        } else {
          await clearMacOSMetadata(file);
        }

        // Step 2: Clear embedded metadata with ExifTool
        // Using execFile is safer than shell execution
        const exifArgs = [
          "-all=",
          "-EXIF:all=",
          "-GPS:all=",
          "-IPTC:all=",
          "-XMP:all=",
          "-ICC_Profile:all=",
          "-ThumbnailImage=",
          "-PreviewImage=",
          "-Comment=",
          "-MakerNotes=",
          "-UserComment=",
          "-PDF:all=",
          "-ID3:all=",
          "-QuickTime:all=",
          "-overwrite_original",
          "-q",
          file,
        ];

        try {
          await execFilePromise(exifToolPath, exifArgs);
        } catch (error) {
          console.warn("Detailed metadata clearing failed, trying fallback", error);
          // If detailed command fails, try simpler fallback
          // Fallback also uses execFile for safety
          try {
            await execFilePromise(exifToolPath, ["-all=", "-overwrite_original", "-q", file]);
          } catch (fallbackError) {
            console.error(`Failed to clear metadata for ${file}:`, fallbackError);
            throw fallbackError;
          }
        }

        // Step 3: Update modification date
        try {
          const now = new Date();
          await utimes(file, now, now);
        } catch {
          // Ignore timestamp update errors
        }

        successCount++;
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
        failureCount++;
      }
    }

    if (failureCount === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Metadata cleared",
        message: `Successfully cleared ${successCount} ${successCount === 1 ? "file" : "files"}`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: failureCount === selectedItems.length ? "Failed" : "Partially completed",
        message: `Cleared ${successCount}, Failed ${failureCount}`,
      });
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
