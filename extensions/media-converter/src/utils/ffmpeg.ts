import fs from "fs";
import os from "os";
import path from "path";
import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { runProcess } from "./process";
import * as ffmpegStatic from "./ffmpeg-static";

type FFmpegInfo = { path: string; version: number };

let cachedFFmpeg: { key: string; info: FFmpegInfo } | null = null;
let inFlightFFmpegLookup: { key: string; promise: Promise<FFmpegInfo | null> } | null = null;

export function clearFFmpegCache(): void {
  cachedFFmpeg = null;
  inFlightFFmpegLookup = null;
}

export function findWinGetFFmpegPaths(localAppData: string): string[] {
  const results: string[] = [];
  const linksCandidate = path.join(localAppData, "Microsoft", "WinGet", "Links", "ffmpeg.exe");
  if (fs.existsSync(linksCandidate)) results.push(linksCandidate);

  const packagesDir = path.join(localAppData, "Microsoft", "WinGet", "Packages");
  if (!fs.existsSync(packagesDir)) return results;

  try {
    for (const pkg of fs.readdirSync(packagesDir)) {
      if (!pkg.toLowerCase().includes("ffmpeg")) continue;
      const pkgDir = path.join(packagesDir, pkg);
      const directBin = path.join(pkgDir, "bin", "ffmpeg.exe");
      if (fs.existsSync(directBin)) results.push(directBin);
      const directExe = path.join(pkgDir, "ffmpeg.exe");
      if (fs.existsSync(directExe)) results.push(directExe);
      try {
        for (const sub of fs.readdirSync(pkgDir)) {
          const nestedBin = path.join(pkgDir, sub, "bin", "ffmpeg.exe");
          if (fs.existsSync(nestedBin)) results.push(nestedBin);
          const nestedExe = path.join(pkgDir, sub, "ffmpeg.exe");
          if (fs.existsSync(nestedExe)) results.push(nestedExe);
        }
      } catch {
        // Ignore unreadable subdirectories
      }
    }
  } catch {
    // Ignore unreadable packages directory
  }
  return results;
}

export async function checkFFmpegVersion(ffmpegPath: string): Promise<number | null> {
  try {
    const { stdout, stderr } = await runProcess({ command: ffmpegPath, args: ["-version"] });
    const output = `${stdout}\n${stderr}`;
    const versionMatch = output.match(/ffmpeg version (\d+)\.(\d+)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1], 10);
      const minor = parseInt(versionMatch[2], 10);
      return major + minor / 10; // Convert to decimal format like 6.1
    }
    // Support FFmpeg git master builds (e.g. "ffmpeg version N-128251-g6d1bfd7609-20261031" or "git-2026-...")
    if (/ffmpeg version (?:N-\d+|git-)/i.test(output)) {
      return 99.0;
    }
    return null;
  } catch (error) {
    console.error("Error checking FFmpeg version:", error);
    return null;
  }
}

export async function findFFmpegPath(minimumVersion = 6.0): Promise<FFmpegInfo | null> {
  let customPath: unknown;
  try {
    customPath = getPreferenceValues().ffmpeg_path;
  } catch {
    customPath = undefined;
  }
  const environmentPath = process.env.FFMPEG_BIN;
  const preferredPath =
    typeof customPath === "string" && customPath.trim()
      ? customPath.trim()
      : typeof environmentPath === "string" && environmentPath.trim()
        ? environmentPath.trim()
        : undefined;
  const cacheKey = `${preferredPath ?? ""}`;

  if (
    cachedFFmpeg &&
    cachedFFmpeg.key === cacheKey &&
    cachedFFmpeg.info.version >= minimumVersion &&
    fs.existsSync(cachedFFmpeg.info.path)
  ) {
    return cachedFFmpeg.info;
  }

  const lookupKey = `${cacheKey}|${minimumVersion}`;
  if (inFlightFFmpegLookup && inFlightFFmpegLookup.key === lookupKey) {
    return inFlightFFmpegLookup.promise;
  }

  const promise = detectFFmpegPath(preferredPath, minimumVersion).then((result) => {
    if (result) {
      cachedFFmpeg = { key: cacheKey, info: result };
    }
    if (inFlightFFmpegLookup?.promise === promise) {
      inFlightFFmpegLookup = null;
    }
    return result;
  });
  inFlightFFmpegLookup = { key: lookupKey, promise };
  return promise;
}

async function detectFFmpegPath(preferredPath: string | undefined, minimumVersion: number): Promise<FFmpegInfo | null> {
  try {
    if (preferredPath && fs.existsSync(preferredPath)) {
      const version = await checkFFmpegVersion(preferredPath);
      if (version && version >= minimumVersion) {
        // Store the valid custom path
        await LocalStorage.setItem("ffmpeg-path", preferredPath);
        console.log(`Found custom FFmpeg at: ${preferredPath} with version: ${version}`);
        return { path: preferredPath, version };
      }
    }

    // Check stored ffmpeg path (from previous auto-detection or installation)
    const storedPath = await LocalStorage.getItem("ffmpeg-path");
    if (storedPath && typeof storedPath === "string" && fs.existsSync(storedPath)) {
      const version = await checkFFmpegVersion(storedPath);
      if (version && version >= minimumVersion) {
        return { path: storedPath, version };
      }
    }

    // Check FFmpeg on system PATH first (e.g. WinGet / Homebrew / apt)
    try {
      const locator = os.platform() === "win32" ? "where.exe" : "which";
      const { stdout } = await runProcess({ command: locator, args: ["ffmpeg"] });
      for (const candidate of stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)) {
        if (fs.existsSync(candidate)) {
          const version = await checkFFmpegVersion(candidate);
          if (version && version >= minimumVersion) {
            await LocalStorage.setItem("ffmpeg-path", candidate);
            console.log(`Found FFmpeg on PATH at: ${candidate} with version: ${version}`);
            return { path: candidate, version };
          }
        }
      }
    } catch {
      // Not on PATH; continue checking common installation paths
    }

    // Check common system installation paths directly
    const platform = os.platform();
    const commonPaths = [];

    // Note: the following common paths were generated by Claude Sonnet 4, I did not verify them all, but they are likely to be correct.
    // Even if they aren't, the user will be able to specify their custom path in the extension preferences.
    if (platform === "darwin") {
      // macOS common paths
      commonPaths.push(
        // Homebrew (Intel)
        "/usr/local/bin/ffmpeg",
        // Homebrew (Apple Silicon)
        "/opt/homebrew/bin/ffmpeg",
        // System paths
        "/usr/bin/ffmpeg",
        // MacPorts
        "/opt/local/bin/ffmpeg",
        // Nix
        "/nix/store/*/bin/ffmpeg",
        `${os.homedir()}/.nix-profile/bin/ffmpeg`,
        "/run/current-system/sw/bin/ffmpeg",
        // Conda/Miniconda/Anaconda
        `${os.homedir()}/miniconda3/bin/ffmpeg`,
        `${os.homedir()}/anaconda3/bin/ffmpeg`,
        `${os.homedir()}/mambaforge/bin/ffmpeg`,
        "/usr/local/miniconda3/bin/ffmpeg",
        "/usr/local/anaconda3/bin/ffmpeg",
        // Fink
        "/sw/bin/ffmpeg",
        // Manual installations
        "/Applications/ffmpeg",
        "/Applications/FFmpeg/ffmpeg",
        `${os.homedir()}/bin/ffmpeg`,
        `${os.homedir()}/.local/bin/ffmpeg`,
        // pkgsrc
        "/usr/pkg/bin/ffmpeg",
      );
    } else if (platform === "win32") {
      // Windows common paths
      const programFiles = process.env.ProgramFiles || "C:\\Program Files";
      const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
      const userProfile = os.homedir() || process.env.USERPROFILE || "";
      // Under Windows MSIX (Raycast), LOCALAPPDATA may point to LocalCache\Local instead of the real AppData\Local.
      const realLocalAppData = userProfile ? path.join(userProfile, "AppData", "Local") : "";
      const envLocalAppData = process.env.LOCALAPPDATA || "";
      const localAppDataDirs = Array.from(new Set([realLocalAppData, envLocalAppData].filter(Boolean)));
      const winGetCandidates = localAppDataDirs.flatMap((dir) => findWinGetFFmpegPaths(dir));

      commonPaths.push(
        // WinGet (scans real AppData\Local and env LOCALAPPDATA for Links and Packages\*ffmpeg*\*\bin\ffmpeg.exe)
        ...winGetCandidates,
        // Standard installation paths
        `${programFiles}\\ffmpeg\\bin\\ffmpeg.exe`,
        `${programFilesX86}\\ffmpeg\\bin\\ffmpeg.exe`,
        "C:\\ffmpeg\\bin\\ffmpeg.exe",
        // Chocolatey
        `${programFiles}\\ffmpeg\\ffmpeg.exe`,
        "C:\\ProgramData\\chocolatey\\lib\\ffmpeg\\tools\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\tools\\ffmpeg\\bin\\ffmpeg.exe",
        // Scoop
        `${userProfile}\\scoop\\apps\\ffmpeg\\current\\bin\\ffmpeg.exe`,
        `${userProfile}\\scoop\\shims\\ffmpeg.exe`,
        // Conda/Miniconda/Anaconda
        `${userProfile}\\miniconda3\\Scripts\\ffmpeg.exe`,
        `${userProfile}\\anaconda3\\Scripts\\ffmpeg.exe`,
        `${userProfile}\\mambaforge\\Scripts\\ffmpeg.exe`,
        "C:\\ProgramData\\Miniconda3\\Scripts\\ffmpeg.exe",
        "C:\\ProgramData\\Anaconda3\\Scripts\\ffmpeg.exe",
        // MSYS2/MinGW
        "C:\\msys64\\usr\\bin\\ffmpeg.exe",
        "C:\\msys64\\mingw64\\bin\\ffmpeg.exe",
        "C:\\msys64\\mingw32\\bin\\ffmpeg.exe",
        // User local installations
        `${userProfile}\\bin\\ffmpeg.exe`,
        `${userProfile}\\Tools\\ffmpeg\\bin\\ffmpeg.exe`,
        ...localAppDataDirs.map((dir) => path.join(dir, "Programs", "ffmpeg", "bin", "ffmpeg.exe")),
      );
    } else {
      // Linux & Unix common paths
      const homeDir = os.homedir();

      commonPaths.push(
        // System paths
        "/usr/bin/ffmpeg",
        "/usr/local/bin/ffmpeg",
        "/bin/ffmpeg",
        // Snap
        "/snap/bin/ffmpeg",
        "/var/lib/snapd/snap/bin/ffmpeg",
        // Flatpak
        "/var/lib/flatpak/exports/bin/org.ffmpeg.FFmpeg",
        `${homeDir}/.local/share/flatpak/exports/bin/org.ffmpeg.FFmpeg`,
        // AppImage
        `${homeDir}/Applications/ffmpeg.AppImage`,
        `${homeDir}/.local/bin/ffmpeg.AppImage`,
        // Nix
        "/nix/store/*/bin/ffmpeg",
        `${homeDir}/.nix-profile/bin/ffmpeg`,
        "/run/current-system/sw/bin/ffmpeg",
        // Conda/Miniconda/Anaconda
        `${homeDir}/miniconda3/bin/ffmpeg`,
        `${homeDir}/anaconda3/bin/ffmpeg`,
        `${homeDir}/mambaforge/bin/ffmpeg`,
        "/opt/miniconda3/bin/ffmpeg",
        "/opt/anaconda3/bin/ffmpeg",
        // User local installations
        `${homeDir}/bin/ffmpeg`,
        `${homeDir}/.local/bin/ffmpeg`,
        // Distribution-specific paths
        "/opt/ffmpeg/bin/ffmpeg",
        "/usr/local/ffmpeg/bin/ffmpeg",
        // Build from source common locations
        `${homeDir}/ffmpeg/ffmpeg`,
        `${homeDir}/src/ffmpeg/ffmpeg`,
        "/opt/local/bin/ffmpeg", // MacPorts on some Linux distros
      );
    }

    // Check if any of the common paths exist and meet version requirements
    for (const path of commonPaths) {
      if (fs.existsSync(path)) {
        const version = await checkFFmpegVersion(path);
        if (version && version >= minimumVersion) {
          // Store the found path for future use
          await LocalStorage.setItem("ffmpeg-path", path);
          console.log(`Found FFmpeg at: ${path} with version: ${version}`);
          return { path, version };
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding valid FFmpeg:", error);
    return null;
  }
}

export async function installFFmpegBinary(onProgress?: (progress: number) => void): Promise<void> {
  try {
    const downloadDir = environment.supportPath;

    // Ensure the download directory exists
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    console.log(`Download dir set to: ${downloadDir}`);

    // Get the expected binary path for the custom download directory
    const ffmpegPath = ffmpegStatic.getBinaryPath(downloadDir);

    console.log(`FFmpeg static returned path: ${ffmpegPath}`);

    if (!ffmpegPath) {
      throw new Error("FFmpeg installer did not provide a valid path for this platform");
    }

    // Check if the binary already exists at the returned path (if weird user behavior during download)
    let needsInstallation = !fs.existsSync(ffmpegPath);

    // If binary exists, verify it's working properly
    if (!needsInstallation) {
      try {
        console.log("FFmpeg binary exists, verifying it works...");
        const { stdout } = await runProcess({ command: ffmpegPath, args: ["-version"] });
        if (!stdout.includes("ffmpeg version")) {
          console.log("Existing FFmpeg binary is not working properly, will reinstall");
          needsInstallation = true;
        } else {
          console.log("Existing FFmpeg binary is working properly");
        }
      } catch (error) {
        console.log("Existing FFmpeg binary verification failed, will reinstall:", error);
        needsInstallation = true;
      }
    }

    if (needsInstallation) {
      // If binary exists but is corrupted, remove it first
      if (fs.existsSync(ffmpegPath)) {
        console.log("Removing corrupted FFmpeg binary...");
        try {
          fs.unlinkSync(ffmpegPath);
        } catch (error) {
          console.warn("Warning: Could not remove corrupted binary:", error);
          // Continue anyway, the installer might overwrite it
        }
      }

      console.log("FFmpeg binary not found or corrupted, running install process...");
      await ffmpegStatic.installBinary(downloadDir, onProgress);
    }

    // Check again after potential install
    if (!fs.existsSync(ffmpegPath)) {
      throw new Error(`FFmpeg binary not found at expected path: ${ffmpegPath}`);
    }

    // Make it executable (Unix/Linux/macOS only, on Windows .exe files are executable by default)
    const platform = os.platform();
    if (platform !== "win32") {
      try {
        fs.chmodSync(ffmpegPath, 0o755);
      } catch (error) {
        console.warn("Warning: Could not set executable permissions:", error);
        // Continue execution as this might not be critical on some systems
      }
    }

    // Final verification that the binary works (only if we just installed it)
    if (needsInstallation) {
      const { stdout } = await runProcess({ command: ffmpegPath, args: ["-version"] });
      if (!stdout.includes("ffmpeg version")) {
        throw new Error("FFmpeg binary installation verification failed");
      }
    }

    // Store the path and clear in-memory cache so the newly installed binary is picked up immediately
    await LocalStorage.setItem("ffmpeg-path", ffmpegPath);
    clearFFmpegCache();
    console.log(`FFmpeg successfully installed to: ${ffmpegPath}`);
  } catch (error) {
    console.error("Error installing FFmpeg:", error);
    throw error;
  }
}
