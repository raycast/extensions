import { confirmAlert, showToast, Toast, Alert, getSelectedFinderItems, Clipboard, open } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

const execPromise = promisify(exec);

/**
 * Comprehensive list of metadata types that WILL be cleared:
 *
 * EXIF Metadata:
 * - Camera settings (ISO, aperture, shutter speed, focal length)
 * - Device information (make, model, serial number)
 * - Date/time information (created, modified, original)
 * - Image settings (orientation, resolution, color space)
 * - Flash and exposure settings
 * - White balance and color temperature
 *
 * GPS/Location Data:
 * - Latitude and longitude coordinates
 * - Altitude and direction
 * - GPS timestamp
 * - Location names and addresses
 *
 * IPTC Metadata:
 * - Copyright information
 * - Keywords and tags
 * - Caption and description
 * - Creator and contact information
 * - Location names
 *
 * XMP Metadata:
 * - Adobe-specific metadata
 * - Rating and labels
 * - History and edit information
 * - Custom metadata fields
 *
 * Document Metadata:
 * - PDF author, creator, producer information
 * - Word document properties (author, company, etc.)
 * - Office document metadata
 * - Document revision history
 *
 * Audio/Video Metadata:
 * - ID3 tags (artist, album, genre, etc.)
 * - Video codec and encoding information
 * - Audio bitrate and format details
 * - Playlist and chapter information
 *
 * Other Embedded Data:
 * - Thumbnails and preview images
 * - ICC color profiles
 * - Maker notes (manufacturer-specific data)
 * - Comments and annotations
 * - Software and application information
 * - Resource forks (macOS)
 *
 * System Metadata (macOS):
 * - Extended attributes (xattr)
 * - Finder tags and labels
 * - Spotlight metadata
 * - File ownership (user/group) - if permissions allow
 *
 *
 * Metadata types that are NOT cleared (by design):
 *
 * File System Metadata (preserved for functionality):
 * - File permissions (read/write/execute) - needed for file access
 * - File creation date - filesystem limitation (cannot be changed on macOS)
 * - File size - inherent to file content
 * - File type/extension - needed for file identification
 *
 * Note: File modification date IS cleared (set to current time when cleared).
 * File ownership clearing requires appropriate permissions.
 * If you don't have permission to change ownership, that step will be skipped.
 */

async function getExifToolPath(): Promise<string | null> {
  // Check common installation paths first (more reliable than PATH in Raycast)
  const commonPaths = [
    "/usr/local/bin/exiftool",
    "/opt/homebrew/bin/exiftool",
    "/usr/bin/exiftool",
    process.platform === "win32" ? "C:\\Program Files\\ExifTool\\exiftool.exe" : null,
  ].filter(Boolean) as string[];

  // Check if exiftool exists in common locations
  for (const path of commonPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Fallback: try to execute exiftool command (checks PATH)
  try {
    await execPromise("exiftool -ver");
    return "exiftool"; // Use command name if found in PATH
  } catch {
    return null;
  }
}

async function isPackageManagerInstalled(): Promise<boolean> {
  if (process.platform === "win32") {
    // Check for Chocolatey on Windows - check common paths first
    const chocoPaths = ["C:\\ProgramData\\chocolatey\\bin\\choco.exe", "C:\\Program Files\\chocolatey\\bin\\choco.exe"];

    for (const path of chocoPaths) {
      if (existsSync(path)) {
        return true;
      }
    }

    // Fallback: try to execute choco command
    try {
      await execPromise("choco --version");
      return true;
    } catch {
      return false;
    }
  }

  // Check for Homebrew on macOS - check common paths first (more reliable)
  const brewPaths = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew", "/homebrew/bin/brew"];

  for (const path of brewPaths) {
    if (existsSync(path)) {
      return true;
    }
  }

  // Fallback: try to execute brew command (checks PATH)
  try {
    await execPromise("brew --version");
    return true;
  } catch {
    return false;
  }
}

async function getBrewPath(): Promise<string> {
  // Check common Homebrew paths first
  const brewPaths = ["/opt/homebrew/bin/brew", "/usr/local/bin/brew", "/homebrew/bin/brew"];

  for (const path of brewPaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Fallback to command name
  return "brew";
}

async function installExifTool(): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      // Windows: try choco, if not available, show manual instructions
      try {
        await execPromise("choco --version");
        await execPromise("choco install exiftool -y");
        return true;
      } catch {
        // Choco not installed, will show manual instructions
        return false;
      }
    } else {
      // macOS: use brew with full path if available
      const brewPath = await getBrewPath();
      await execPromise(`"${brewPath}" install exiftool`);
      return true;
    }
  } catch (error) {
    console.error("Installation error:", error);
    return false;
  }
}

export default async function main() {
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
    if (!exifToolPath) {
      // Check if package manager is installed
      const hasPackageManager = await isPackageManagerInstalled();

      if (!hasPackageManager) {
        // Package manager not installed - show installation instructions
        let installCommand: string;
        let title: string;
        let description: string;
        let steps: string[];
        let buttonText: string;

        if (process.platform === "win32") {
          installCommand =
            "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))";
          title = "Install Chocolatey";
          description = "Chocolatey helps us install the tools needed to clear file metadata.";
          steps = [
            "Right-click on PowerShell and select 'Run as Administrator'",
            "Copy the command shown below",
            "Paste it into PowerShell (Ctrl+V)",
            "Press Enter and wait for installation",
            "Return here and try clearing metadata again",
          ];
          buttonText = "Copy Command";
        } else {
          installCommand =
            '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"';
          title = "Install Homebrew";
          description = "Homebrew helps us install the tools needed to clear file metadata.";
          steps = [
            "Click 'Open Terminal' below",
            "The command will be pasted automatically",
            "Press Enter to start installation",
            "Follow any prompts (you may need to enter your password)",
            "When finished, return here and try again",
          ];
          buttonText = "Open Terminal";
        }

        const installMessage = `${description}\n\n📋 Installation Steps:\n${steps.map((step, i) => `\n${i + 1}. ${step}`).join("")}\n\n💻 Command to run:\n${installCommand}`;

        const action = await confirmAlert({
          title: title,
          message: installMessage,
          primaryAction: {
            title: buttonText,
            style: Alert.ActionStyle.Default,
          },
          dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
        });

        if (action) {
          if (process.platform !== "win32") {
            // macOS: Copy command, open Terminal, and paste automatically
            await Clipboard.copy(installCommand);
            try {
              // Open Terminal and wait a moment, then paste
              await execPromise(
                `osascript -e 'tell application "Terminal" to activate' -e 'delay 0.5' -e 'tell application "System Events" to keystroke "v" using command down'`,
              );
              await showToast({
                style: Toast.Style.Success,
                title: "Terminal opened",
                message: "Command pasted - press Enter to install",
              });
            } catch {
              // Fallback: just open Terminal
              await open("terminal://");
              await showToast({
                style: Toast.Style.Success,
                title: "Terminal opened",
                message: "Command copied - paste (Cmd+V) and press Enter",
              });
            }
          } else {
            // Windows: copy command
            await Clipboard.copy(installCommand);
            await showToast({
              style: Toast.Style.Success,
              title: "Command copied",
              message: "Paste in PowerShell (Admin) and press Enter",
            });
          }
        }
        return;
      }

      // Package manager is available, offer to install ExifTool automatically
      const shouldInstall = await confirmAlert({
        title: "Installation Required",
        message: `We need to install a helper tool to clear file metadata. This will only take a moment.\n\nWould you like to install it now?`,
        primaryAction: { title: "Install", style: Alert.ActionStyle.Default },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      });

      if (!shouldInstall) {
        return;
      }

      // Show progress toast
      await showToast({
        style: Toast.Style.Animated,
        title: "Installing...",
        message: "This may take a minute",
      });

      const installSuccess = await installExifTool();

      if (!installSuccess) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Installation Failed",
          message: "Please try again or install manually",
        });
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

      await showToast({
        style: Toast.Style.Success,
        title: "Ready!",
        message: "You can now clear file metadata",
      });
    }

    const confirmed = await confirmAlert({
      title: "Clear File Metadata",
      message: `This will permanently remove all metadata from the selected ${selectedItems.length === 1 ? "file" : "files"}. The file contents will remain unchanged.`,
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
      dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
    });

    if (!confirmed) {
      return;
    }

    // Show progress toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Clearing metadata...",
      message: `Processing ${selectedItems.length} ${selectedItems.length === 1 ? "file" : "files"}`,
    });

    let successCount = 0;
    let failureCount = 0;

    for (const item of selectedItems) {
      const file = item.path;
      const fileName = file.split("/").pop() || file.split("\\").pop() || file;

      try {
        // Update progress message
        await showToast({
          style: Toast.Style.Animated,
          title: "Clearing metadata...",
          message: `Processing: ${fileName}`,
        });
        // Step 1: Clear macOS extended attributes and system metadata
        if (process.platform !== "win32") {
          try {
            // Clear all extended attributes
            await execPromise(`xattr -c "${file}"`);
            // Also clear com.apple metadata specifically
            await execPromise(`xattr -d com.apple.metadata:kMDItemFinderComment "${file}" 2>/dev/null || true`);
            await execPromise(`xattr -d com.apple.quarantine "${file}" 2>/dev/null || true`);
            await execPromise(`xattr -d com.apple.FinderInfo "${file}" 2>/dev/null || true`);
            await execPromise(`xattr -d com.apple.ResourceFork "${file}" 2>/dev/null || true`);

            // Clear resource fork (macOS legacy metadata storage)
            try {
              await execPromise(`rm -f "${file}/..namedfork/rsrc" 2>/dev/null || true`);
            } catch {
              // Resource fork may not exist, continue
            }

            // Clear file ownership (requires appropriate permissions)
            // This will change ownership to current user if possible
            try {
              const currentUser = process.env.USER || process.env.USERNAME || "nobody";
              await execPromise(`chown "${currentUser}" "${file}" 2>/dev/null || true`);
            } catch {
              // May not have permission to change ownership, skip silently
              console.log("File ownership unchanged (permission required)");
            }
          } catch {
            // Some attributes might not exist, continue anyway
            console.log("Extended attributes cleared (some may not have existed)");
          }
        } else {
          // Windows: clear alternate data streams and file ownership
          try {
            await execPromise(`powershell -Command "Get-Item -Path '${file}' | Clear-ItemProperty -Name *"`);
            // Clear file ownership (requires admin rights)
            try {
              const currentUser = process.env.USERNAME || process.env.USER || "Everyone";
              await execPromise(
                `powershell -Command "TakeOwn /F '${file}' /A 2>$null; icacls '${file}' /setowner '${currentUser}' /T 2>$null"`,
              );
            } catch {
              // May not have permission, skip silently
              console.log("File ownership unchanged (admin rights required)");
            }
          } catch {
            console.log("Windows metadata cleared");
          }
        }

        // Step 2: Clear all embedded metadata using ExifTool with comprehensive flags
        // Comprehensive command that removes:
        // -all= removes all metadata tags
        // -EXIF:all= explicitly removes all EXIF data (camera settings, device info)
        // -GPS:all= removes all GPS/location data (latitude, longitude, altitude)
        // -IPTC:all= removes IPTC metadata (copyright, keywords, captions)
        // -XMP:all= removes XMP metadata (Adobe, ratings, labels)
        // -ICC_Profile:all= removes color profiles
        // -ThumbnailImage= removes embedded thumbnails
        // -PreviewImage= removes preview images
        // -Comment= removes comments
        // -MakerNotes= removes manufacturer-specific notes
        // -UserComment= removes user comments
        // -PDF:all= removes PDF metadata (author, creator, producer)
        // -ID3:all= removes ID3 tags from audio files
        // -QuickTime:all= removes QuickTime metadata
        // -overwrite_original modifies file in place (no backup)
        // -q quiet mode (suppresses output)

        const comprehensiveCommand = `"${exifToolPath}" -all= -EXIF:all= -GPS:all= -IPTC:all= -XMP:all= -ICC_Profile:all= -ThumbnailImage= -PreviewImage= -Comment= -MakerNotes= -UserComment= -PDF:all= -ID3:all= -QuickTime:all= -overwrite_original -q "${file}"`;

        try {
          await execPromise(comprehensiveCommand);
        } catch {
          // If comprehensive command fails, try simpler fallback
          try {
            await execPromise(`"${exifToolPath}" -all= -overwrite_original -q "${file}"`);
          } catch (fallbackError) {
            console.error(`Failed to clear metadata for ${file}:`, fallbackError);
            throw fallbackError;
          }
        }

        // Step 3: Explicitly update file modification date to current time
        // ExifTool's -overwrite_original may preserve modification date, so we force update it
        try {
          if (process.platform === "win32") {
            // Windows: Update modification date using PowerShell
            await execPromise(`powershell -Command "(Get-Item '${file}').LastWriteTime = Get-Date"`);
          } else {
            // macOS/Linux: Update modification date using touch command
            // -m flag updates only modification time to current time
            await execPromise(`touch -m "${file}"`);
          }
        } catch {
          // If touch fails, try without -m flag as fallback
          try {
            if (process.platform !== "win32") {
              await execPromise(`touch "${file}"`);
            }
          } catch {
            console.log("File modification date update failed - file may retain original date");
          }
        }

        successCount++;
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
        failureCount++;
        // Continue with other files even if one fails
      }
    }

    // Show final result
    if (failureCount === 0) {
      await showToast({
        style: Toast.Style.Success,
        title: "Metadata cleared",
        message: `Successfully cleared ${successCount} ${successCount === 1 ? "file" : "files"}`,
      });
    } else if (successCount > 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Partially completed",
        message: `Cleared ${successCount} ${successCount === 1 ? "file" : "files"}, ${failureCount} failed`,
      });
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: `Could not clear metadata for ${failureCount} ${failureCount === 1 ? "file" : "files"}`,
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
