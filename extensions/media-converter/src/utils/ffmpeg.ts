import fs from "fs";
import util from "util";
import { exec } from "child_process";

const execPromise = util.promisify(exec);

export async function isFFmpegInstalled(): Promise<boolean> {
  try {
    const ffmpegPath = "/usr/local/bin/ffmpeg";
    const altPath = "/opt/homebrew/bin/ffmpeg";
    const exists = fs.existsSync(ffmpegPath) || fs.existsSync(altPath);

    if (!exists) {
      // Try checking with which command as fallback
      const { stdout } = await execPromise("which ffmpeg");
      return stdout.trim().length > 0;
    }

    return true;
  } catch (error) {
    console.error("Error checking FFmpeg installation:", error);
    return false;
  }
}

export async function getFFmpegPath(): Promise<string> {
  const ffmpegPath = "/usr/local/bin/ffmpeg";
  const altPath = "/opt/homebrew/bin/ffmpeg";

  if (fs.existsSync(ffmpegPath)) return ffmpegPath;
  if (fs.existsSync(altPath)) return altPath;

  throw new Error("FFmpeg not found. Please install it using Homebrew: brew install ffmpeg");
}

export async function downloadFFmpeg(): Promise<void> {
  await execPromise("/opt/homebrew/bin/brew install ffmpeg");
}
