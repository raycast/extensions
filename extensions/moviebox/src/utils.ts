import fs from "fs";
import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";
import { StreamData } from "./moviebox/types";

const execFileAsync = promisify(execFile);

interface Preferences {
  player: string;
}

const MPV_PATHS = [
  "/Applications/mpv.app",
  "/opt/homebrew/bin/mpv",
  "/usr/local/bin/mpv",
];

export function detectPlayer(): string {
  const { player } = getPreferenceValues<Preferences>();
  const preferred = player.toLowerCase();

  if (["iina", "vlc", "mpv"].includes(preferred)) {
    return preferred.toUpperCase() === "IINA"
      ? "IINA"
      : preferred === "vlc"
        ? "VLC"
        : "mpv";
  }

  if (fs.existsSync("/Applications/IINA.app")) return "IINA";
  if (fs.existsSync("/Applications/VLC.app")) return "VLC";
  if (MPV_PATHS.some((path) => fs.existsSync(path))) return "mpv";

  return "default";
}

export async function launchPlayer(
  player: string,
  streamUrl: string,
  subtitleUrl?: string,
) {
  let executable = "open";
  let args: string[] = [];

  switch (player) {
    case "IINA":
      args = ["-a", "IINA", streamUrl];
      if (subtitleUrl) args.push("--args", `--mpv-sub-file=${subtitleUrl}`);
      break;
    case "VLC":
      args = ["-a", "VLC", streamUrl];
      if (subtitleUrl) args.push("--args", `--sub-file=${subtitleUrl}`);
      break;
    case "mpv": {
      const isApp = fs.existsSync("/Applications/mpv.app");
      if (isApp) {
        args = ["-a", "mpv", streamUrl];
        if (subtitleUrl) args.push("--args", `--sub-file=${subtitleUrl}`);
      } else {
        executable = fs.existsSync("/opt/homebrew/bin/mpv")
          ? "/opt/homebrew/bin/mpv"
          : "/usr/local/bin/mpv";
        args = [streamUrl];
        if (subtitleUrl) args.push(`--sub-file=${subtitleUrl}`);
      }
      break;
    }
    default:
      args = [streamUrl];
      break;
  }

  await execFileAsync(executable, args);
}

export function extractStreamUrl(data: StreamData | null): string {
  const stream = data?.list?.[0] || data?.items?.[0];
  if (!stream) throw new Error("No stream available for this title");

  const url = stream.resourceLink || stream.fileUrl || stream.path;
  if (!url) throw new Error("Could not extract stream URL");

  return url;
}
