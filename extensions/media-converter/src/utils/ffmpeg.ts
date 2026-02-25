import fs from "fs";
import os from "os";
import { LocalStorage, environment, getPreferenceValues } from "@raycast/api";
import { execPromise } from "./exec";
import * as ffmpegStatic from "./ffmpeg-static";
import { access, constants } from "fs/promises";
import which from "which";

export async function checkFFmpegVersion(ffmpegPath: string): Promise<number | null> {
  try {
    const { stdout } = await execPromise(`"${ffmpegPath}" -version`);
    const versionMatch = stdout.match(/ffmpeg version (\d+)\.(\d+)/);
    if (versionMatch) {
      const major = parseInt(versionMatch[1], 10);
      const minor = parseInt(versionMatch[2], 10);
      return major + minor / 10; // Convert to decimal format like 6.1
    }
    return null;
  } catch (error) {
    console.error("Error checking FFmpeg version:", error);
    return null;
  }
}

export async function findFFmpegPath(minimumVersion = 6.0): Promise<{ path: string; version: number } | null> {
  const canExec = async (p?: string | null) =>
    !!p &&
    (await access(p, constants.X_OK).then(
      () => true,
      () => false,
    ));

  const check = async (p?: string | null) => {
    if (!(await canExec(p))) return null;
    const v = await checkFFmpegVersion(p!);
    return v && v >= minimumVersion ? { path: p!, version: v } : null;
  };

  const { ffmpeg_path: custom } = getPreferenceValues();
  const stored = await LocalStorage.getItem<string>("ffmpeg-path");
  const whichPath = which.sync("ffmpeg", { nothrow: true });

  console.log(`custom: ${custom}`);
  console.log(`stored: ${stored}`);
  console.log(`which : ${whichPath}`);

  const [storedResult, customResult, whichResult] = await Promise.all([check(stored), check(custom), check(whichPath)]);

  const result = storedResult ?? customResult ?? whichResult;

  if (!result) return null;

  await LocalStorage.setItem("ffmpeg-path", result.path);

  return result;
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
        const { stdout } = await execPromise(`"${ffmpegPath}" -version`);
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
      const { stdout } = await execPromise(`"${ffmpegPath}" -version`);
      if (!stdout.includes("ffmpeg version")) {
        throw new Error("FFmpeg binary installation verification failed");
      }
    }

    // Store the path
    await LocalStorage.setItem("ffmpeg-path", ffmpegPath);
    console.log(`FFmpeg successfully installed to: ${ffmpegPath}`);
  } catch (error) {
    console.error("Error installing FFmpeg:", error);
    throw error;
  }
}
