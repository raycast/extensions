import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { execa } from "execa";

// ─── Binary resolution ────────────────────────────────────────────────────────

const BREW_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin"];

export function getBinPath(name: string): string | null {
  for (const dir of BREW_PATHS) {
    const full = join(dir, name);
    if (existsSync(full)) return full;
  }
  return null;
}

export function getBrewPath(): string | null {
  return getBinPath("brew");
}

export interface DepsStatus {
  brew: boolean;
  ytdlp: boolean;
  ffmpeg: boolean;
  brewPath: string | null;
  ytdlpPath: string | null;
  ffmpegPath: string | null;
}

export async function checkDeps(): Promise<DepsStatus> {
  return {
    brew: !!getBrewPath(),
    ytdlp: !!getBinPath("yt-dlp"),
    ffmpeg: !!getBinPath("ffmpeg"),
    brewPath: getBrewPath(),
    ytdlpPath: getBinPath("yt-dlp"),
    ffmpegPath: getBinPath("ffmpeg"),
  };
}

// ─── Install a brew package ───────────────────────────────────────────────────

export async function brewInstall(
  pkg: string,
  onLine: (line: string) => void,
): Promise<void> {
  const brew = getBrewPath();
  if (!brew) throw new Error("Homebrew not found");

  const proc = execa(brew, ["install", pkg], {
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
      NONINTERACTIVE: "1",
      CI: "1",
    },
    all: true,
  });

  proc.all?.on("data", (chunk: Buffer) => {
    chunk
      .toString()
      .split("\n")
      .filter(Boolean)
      .forEach((l) => onLine(l.trim().slice(0, 100)));
  });

  await proc;
}

export async function installHomebrew(
  onLine: (line: string) => void,
): Promise<void> {
  const proc = execa(
    "/bin/bash",
    [
      "-c",
      "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)",
    ],
    {
      env: { ...process.env, NONINTERACTIVE: "1", CI: "1" },
      all: true,
    },
  );

  proc.all?.on("data", (chunk: Buffer) => {
    chunk
      .toString()
      .split("\n")
      .filter(Boolean)
      .forEach((l) => onLine(l.trim().slice(0, 100)));
  });

  await proc;
}

// ─── Video info via yt-dlp ────────────────────────────────────────────────────

export interface VideoInfo {
  title: string;
  duration: number;
  thumbnail: string;
  uploader: string;
  url: string;
}

export async function fetchVideoInfo(url: string): Promise<VideoInfo> {
  const ytdlp = getBinPath("yt-dlp");
  if (!ytdlp)
    throw new Error("yt-dlp not installed. Run the Setup command first.");

  const { stdout } = await execa(ytdlp, ["--dump-json", "--no-playlist", url], {
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
    },
  });

  const info = JSON.parse(stdout);
  return {
    title: info.title || "Untitled",
    duration: info.duration || 0,
    thumbnail: info.thumbnail || "",
    uploader: info.uploader || info.channel || "",
    url,
  };
}

// ─── Download ─────────────────────────────────────────────────────────────────

export interface DownloadOptions {
  url: string;
  startTime?: string;
  endTime?: string;
  format: "video" | "audio";
  quality?: string;
  onProgress: (pct: number, line: string) => void;
}

export async function downloadVideo(opts: DownloadOptions): Promise<string> {
  const ytdlp = getBinPath("yt-dlp");
  const ffmpeg = getBinPath("ffmpeg");

  if (!ytdlp) throw new Error("yt-dlp not installed. Run the Setup command.");
  if (!ffmpeg) throw new Error("ffmpeg not installed. Run the Setup command.");

  const outDir = join(homedir(), "Downloads", "clipity");

  const args: string[] = [
    "--no-playlist",
    "--newline",
    "-o",
    join(outDir, "%(title)s.%(ext)s"),
    "--ffmpeg-location",
    join(ffmpeg, ".."),
  ];

  if (opts.format === "audio") {
    args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
  } else {
    const h =
      opts.quality && opts.quality !== "best"
        ? `[height<=${opts.quality}]`
        : "";
    args.push(
      "-f",
      `bestvideo${h}[ext=mp4]+bestaudio[ext=m4a]/best${h}[ext=mp4]/best`,
      "--merge-output-format",
      "mp4",
    );
  }

  const hasStart = opts.startTime && opts.startTime !== "00:00";
  const hasEnd = !!opts.endTime;

  if (hasStart || hasEnd) {
    const s = opts.startTime || "0";
    const e = opts.endTime || "inf";
    args.push("--download-sections", `*${s}-${e}`, "--force-keyframes-at-cuts");
  }

  args.push(opts.url);

  const proc = execa(ytdlp, args, {
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH}`,
    },
    all: true,
  });

  let lastFile = "";

  proc.all?.on("data", (chunk: Buffer) => {
    const lines = chunk.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      const pctMatch = line.match(/(\d+\.?\d*)%/);
      if (pctMatch) opts.onProgress(Math.round(parseFloat(pctMatch[1])), line);

      const destMatch =
        line.match(/\[download\] Destination: (.+)/) ||
        line.match(/\[Merger\] Merging formats into "(.+)"/);
      if (destMatch) lastFile = destMatch[1].trim();
    }
  });

  await proc;
  return lastFile || outDir;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function parseTimeToSeconds(str: string): number | null {
  if (!str?.trim()) return null;
  const parts = str.trim().split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

export function secondsToTimestamp(secs: number): string {
  return formatDuration(Math.max(0, secs));
}
