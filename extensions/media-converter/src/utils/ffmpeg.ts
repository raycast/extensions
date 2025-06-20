import fs from "fs";
import os from "os";
import { LocalStorage, environment } from "@raycast/api";
import { execPromise } from "../utils/exec";
import * as ffmpegStatic from "./ffmpeg-static";

export async function findFFmpegPath(): Promise<string | null> {
  try {
    // Check stored ffmpeg path first
    const storedPath = await LocalStorage.getItem("ffmpeg-path");
    if (storedPath && typeof storedPath === "string" && fs.existsSync(storedPath)) {
      return storedPath;
    }

    // Check common system installation paths directly
    const platform = os.platform();
    const commonPaths = [];

    if (platform === "darwin") {
      // macOS common paths
      commonPaths.push("/usr/local/bin/ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/bin/ffmpeg", "/opt/local/bin/ffmpeg");
    } else if (platform === "win32") {
      // Windows common paths
      commonPaths.push(
        "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\Program Files (x86)\\ffmpeg\\bin\\ffmpeg.exe",
        "C:\\ffmpeg\\bin\\ffmpeg.exe",
      );
    } else {
      // Linux & else common paths
      commonPaths.push("/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg", "/snap/bin/ffmpeg", "/opt/ffmpeg/bin/ffmpeg");
    }

    // Check if any of the common paths exist
    for (const path of commonPaths) {
      if (fs.existsSync(path)) {
        // Store the found path for future use
        await LocalStorage.setItem("ffmpeg-path", path);
        return path;
      }
    }

    return null;
  } catch (error) {
    console.error("Error finding FFmpeg:", error);
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

    // Check if the binary exists at the returned path
    if (!fs.existsSync(ffmpegPath)) {
      // If binary doesn't exist, run the install process
      console.log("FFmpeg binary not found, running install process...");

      // Use the installBinary function from ffmpeg-static with progress callback
      await ffmpegStatic.installBinary(downloadDir, onProgress);
    }

    // Check again after potential install
    if (!fs.existsSync(ffmpegPath)) {
      throw new Error(`FFmpeg binary not found at expected path: ${ffmpegPath}`);
    }

    // Make it executable
    fs.chmodSync(ffmpegPath, 0o755);

    // Verify the binary works
    const { stdout } = await execPromise(`"${ffmpegPath}" -version`);
    if (!stdout.includes("ffmpeg version")) {
      throw new Error("FFmpeg binary installation verification failed");
    }

    // Store the path
    await LocalStorage.setItem("ffmpeg-path", ffmpegPath);
    console.log(`FFmpeg successfully installed to: ${ffmpegPath}`);
  } catch (error) {
    console.error("Error installing FFmpeg:", error);
    throw error;
  }
}
