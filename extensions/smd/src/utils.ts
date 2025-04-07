import { DownloadedMedia } from "./types";
import path from "path";
import os from "os";
import fs from "fs";
import { promisify } from "util";
import { exec } from "child_process";
import { mergerRegex, rejectConvertRegex } from "./const";

export const execAsync = promisify(exec);
export const getSourceDomain = (url: string): string => {
  const urlObj = new URL(url);
  return urlObj.hostname.replace("www.", "");
};

// Function to load history from a json file
export function loadDownloadHistory(): DownloadedMedia[] {
  const historyPath = path.join(os.homedir(), ".raycast-yt-dlp-history.json");
  try {
    if (fs.existsSync(historyPath)) {
      const data = fs.readFileSync(historyPath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading download history:", error);
  }
  return [];
}

// Function to save history to a json file
export function saveDownloadHistory(history: DownloadedMedia[]) {
  const historyPath = path.join(os.homedir(), ".raycast-yt-dlp-history.json");
  try {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error("Error saving download history:", error);
  }
}

export const getMediaInformation = (stdoutData: string) => {
  const getPlatform = () => {
    const loweredStdoutData = stdoutData.toLowerCase();
    if (loweredStdoutData.includes("[instagram]")) {
      return "instagram";
    }
    if (loweredStdoutData.includes("[youtube]")) {
      return "youtube";
    }
    if (loweredStdoutData.includes("[tiktok]")) {
      return "tiktok";
    }
    if (loweredStdoutData.includes("[twitch]")) {
      return "twitch";
    }
    if (loweredStdoutData.includes("[twitter]")) {
      return "twitter";
    }
    if (loweredStdoutData.includes("[facebook]")) {
      return "facebook";
    }
    if (loweredStdoutData.includes("[vimeo]")) {
      return "vimeo";
    }
    if (loweredStdoutData.includes("[reddit]")) {
      return "reddit";
    }

    return null;
  };

  const platform = getPlatform();
  if (!platform) {
    console.log("No platform found", stdoutData);
    return null;
  }

  const merger = stdoutData.match(mergerRegex);

  console.log(`Platform detected: ${platform}`, merger);
  if (merger) {
    return merger;
  }
  console.log("No merger found, checking for reject convert");
  console.log("Reject convert regex:", stdoutData.match(rejectConvertRegex));

  return stdoutData.match(rejectConvertRegex);
};
