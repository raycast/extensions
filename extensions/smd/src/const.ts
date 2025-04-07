import path from "path";
import os from "os";

export const YT_OPTIONS_ARRAY = [
  // More flexible format selection
  "--recode",
  "mp4",
  "-S",
  "vcodec:h264,fps,res,acodec:m4a",
  "--ffmpeg-location",
  "/opt/homebrew/bin/ffmpeg",
  "--write-thumbnail",
  "--convert-thumbnails",
  "png",
];
export const DOWNLOADS_PATH = path.join(os.homedir(), "downloads/yt-dlp");
export const mergerRegex = /\[Merger\] Merging formats into ["']?(.*?\.(?:mp4|webm|mkv))["']?/i;
export const rejectConvertRegex = /\[VideoConvertor\] Not converting media file ["']?(.*?\.(?:mp4|webm|mkv))["']?;/i;
