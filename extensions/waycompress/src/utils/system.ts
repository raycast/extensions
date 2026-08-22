import fs from "fs";
import { exec, spawn } from "child_process";
import { showInFinder, getSelectedFinderItems } from "@raycast/api";
import { SystemToolStatus } from "../engines/types";

/**
 * Get safe PATH environment including common Homebrew / Mac binary locations
 */
export function getAugmentedEnv(): NodeJS.ProcessEnv {
  const currentPath = process.env.PATH || "";
  if (process.platform === "darwin") {
    const extraPaths = [
      "/opt/homebrew/bin",
      "/opt/homebrew/sbin",
      "/usr/local/bin",
      "/usr/bin",
      "/bin",
      "/usr/sbin",
      "/sbin",
    ];
    return {
      ...process.env,
      PATH: `${extraPaths.join(":")}:${currentPath}`,
    };
  }
  return process.env;
}

/**
 * Attempt to get the selected file path from active Windows Explorer window
 */
export async function getSelectedWindowsExplorerFile(): Promise<string | null> {
  if (process.platform !== "win32") return null;

  return new Promise((resolve) => {
    const psScript = `
$ErrorActionPreference = 'SilentlyContinue'
try {
    $shell = New-Object -ComObject Shell.Application
    $activeWindow = $shell.Windows() | Where-Object { $_.LocationName -ne $null -and $_.Visible -eq $true } | Select-Object -First 1
    if ($activeWindow) {
        $selected = $activeWindow.Document.SelectedItems()
        if ($selected -and $selected.Count -gt 0) {
            $selected.Item(0).Path
        }
    }
} catch {}
`.trim();

    const proc = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", psScript]);
    let output = "";

    proc.stdout.on("data", (d) => {
      output += d.toString();
    });

    proc.on("close", () => {
      const trimmed = output.trim();
      if (trimmed && fs.existsSync(trimmed)) {
        resolve(trimmed);
      } else {
        resolve(null);
      }
    });

    proc.on("error", () => {
      resolve(null);
    });

    setTimeout(() => {
      try {
        proc.kill();
      } catch {
        // Ignore
      }
      resolve(null);
    }, 1500);
  });
}

/**
 * Cross-platform detection of active selected file in Windows Explorer or macOS Finder
 */
export async function getActiveFileManagerSelectedFile(): Promise<string | null> {
  if (process.platform === "win32") {
    return await getSelectedWindowsExplorerFile();
  } else {
    try {
      const items = await getSelectedFinderItems();
      if (items && items.length > 0 && fs.existsSync(items[0].path)) {
        return items[0].path;
      }
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Reveal file in Windows Explorer or macOS Finder
 */
export async function revealInFileManager(filePath: string): Promise<void> {
  if (process.platform === "win32") {
    exec(`explorer.exe /select,"${filePath}"`);
  } else {
    await showInFinder(filePath);
  }
}

/**
 * Check if a command is available on PATH
 */
export function checkCliCommand(
  command: string,
  versionArg = "-version"
): Promise<{ available: boolean; version?: string }> {
  return new Promise((resolve) => {
    const proc = spawn(command, [versionArg], {
      env: getAugmentedEnv(),
    });
    let out = "";

    proc.stdout.on("data", (d) => {
      out += d.toString();
    });
    proc.stderr.on("data", (d) => {
      out += d.toString();
    });

    proc.on("close", (code) => {
      if (code === 0 || out.length > 0) {
        const firstLine = out.split("\n")[0].trim();
        resolve({ available: true, version: firstLine });
      } else {
        resolve({ available: false });
      }
    });

    proc.on("error", () => {
      resolve({ available: false });
    });
  });
}

/**
 * Diagnostics check for all compression engines
 */
export async function checkAllSystemTools(): Promise<SystemToolStatus[]> {
  const tools: SystemToolStatus[] = [];

  // Check FFmpeg
  const ffmpegCheck = await checkCliCommand("ffmpeg", "-version");
  tools.push({
    name: "FFmpeg (Video & Image Engine)",
    available: ffmpegCheck.available,
    version: ffmpegCheck.version || "Not found",
    notes: ffmpegCheck.available
      ? "Ready for 2-Pass MP4 video & dynamic image compression"
      : "Required for media compression. Install via 'winget install Gyan.FFmpeg' (Windows) or 'brew install ffmpeg' (macOS)",
  });

  // Check FFprobe
  const ffprobeCheck = await checkCliCommand("ffprobe", "-version");
  tools.push({
    name: "FFprobe (Stream Analyzer)",
    available: ffprobeCheck.available,
    version: ffprobeCheck.version || "Not found",
    notes: ffprobeCheck.available ? "Ready for stream, resolution & bitrate analysis" : "Bundled with FFmpeg",
  });

  // Check Ghostscript
  const gsCheck = await checkCliCommand(process.platform === "win32" ? "gswin64c" : "gs", "--version");
  tools.push({
    name: "Ghostscript (Advanced PDF)",
    available: gsCheck.available,
    version: gsCheck.version || "Not found",
    notes: gsCheck.available
      ? "High-ratio PDF compression enabled"
      : "Optional. Built-in pdf-lib stream optimizer will be used as fallback",
  });

  return tools;
}
