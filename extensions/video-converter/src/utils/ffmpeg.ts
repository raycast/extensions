import fs from "fs";
import util from "util";
import { exec } from "child_process";

const execPromise = util.promisify(exec);

export async function isFFmpegInstalled(): Promise<boolean> {
  const ffmpegPath = "/usr/local/bin/ffmpeg";
  const altPath = "/opt/homebrew/bin/ffmpeg";
  return fs.existsSync(ffmpegPath) || fs.existsSync(altPath);
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
