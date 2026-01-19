import { runAppleScript } from "@raycast/utils";
import { environment } from "@raycast/api";
import { mkdir } from "fs/promises";
import path from "path";
import fs from "fs";

export function getServiceFromUrl(url: string): string {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    if (domain.includes("youtube.com") || domain.includes("youtu.be")) return "YouTube";
    if (domain.includes("tiktok.com")) return "TikTok";
    if (domain.includes("twitter.com") || domain.includes("x.com")) return "Twitter/X";
    if (domain.includes("instagram.com")) return "Instagram";
    if (domain.includes("facebook.com")) return "Facebook";
    if (domain.includes("reddit.com")) return "Reddit";
    return domain;
  } catch {
    return "Unknown";
  }
}

export async function generateThumbnail(filePath: string) {
  try {
    const ext = path.extname(filePath).toLowerCase();

    if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
      return filePath;
    }

    if ([".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"].includes(ext)) {
      const thumbnailDir = path.join(environment.supportPath, "thumbnails");
      if (!fs.existsSync(thumbnailDir)) {
        await mkdir(thumbnailDir, { recursive: true });
      }

      const thumbnailPath = path.join(thumbnailDir, `${path.basename(filePath, ext)}.jpg`);

      try {
        await runAppleScript(`
          set inputFile to POSIX file "${filePath}"
          set outputFile to POSIX file "${thumbnailPath}"
          
          tell application "System Events"
            try
              do shell script "ffmpeg -i " & quoted form of "${filePath}" & " -ss 00:00:01 -vframes 1 -q:v 2 " & quoted form of "${thumbnailPath}" & " 2>/dev/null"
            on error
              try
                do shell script "qlmanage -t -s 512 -o " & quoted form of "${path.dirname(thumbnailPath)}" & " " & quoted form of "${filePath}" & " 2>/dev/null"
                do shell script "mv " & quoted form of "${path.dirname(thumbnailPath)}/${path.basename(filePath)}.png" & " " & quoted form of "${thumbnailPath}" & " 2>/dev/null"
              end try
            end try
          end tell
        `);

        if (fs.existsSync(thumbnailPath)) {
          return thumbnailPath;
        }
      } catch (error) {
        console.warn("Failed to generate thumbnail:", error);
      }
    }

    return null;
  } catch {
    return null;
  }
}
