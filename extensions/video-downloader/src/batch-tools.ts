import { getffmpegPath, getffprobePath, getytdlPath } from "./utils.js";
import { existsSync } from "node:fs";

export interface Tools {
  ytdlp: string;
  ffmpeg: string;
  ffprobe: string;
}

/** Reuse the executables configured by the official Video Downloader command. */
export function getBatchTools(): Tools {
  const tools = {
    ytdlp: getytdlPath(),
    ffmpeg: getffmpegPath(),
    ffprobe: getffprobePath(),
  };
  const missing = Object.entries(tools).find(([, executable]) => !executable || !existsSync(executable));
  if (missing) throw new Error(`${missing[0]} is not configured or is not installed.`);
  return tools;
}
