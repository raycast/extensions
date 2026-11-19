import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { hasProxyEnv, systemProxyEnv } from "./network";
import { CaptureFlags, RuntimeConfig, SubtitleMode } from "./types";

const FFMPEG_CANDIDATES = [
  "/opt/homebrew/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
  "/opt/local/bin/ffmpeg",
  "/usr/bin/ffmpeg",
];

const FFPROBE_CANDIDATES = [
  "/opt/homebrew/bin/ffprobe",
  "/usr/local/bin/ffprobe",
  "/opt/local/bin/ffprobe",
  "/usr/bin/ffprobe",
];

const NODE_CANDIDATES = [process.execPath, "/opt/homebrew/bin/node", "/usr/local/bin/node", "/usr/bin/node"];

export function normalizeServerUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value.replace(/^\/\//, "")}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error("Invalid server URL. Enter the full address, e.g. https://media.example.com");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "The server URL must be plain HTTP/HTTPS without credentials, query string or #. Use the address of the server home page.",
    );
  }
  return url.toString().replace(/\/+$/, "");
}

export function jellyfinStreamUrl(server: string, token: string, itemId: string, mediaSourceId?: string): string {
  const params = new URLSearchParams({ static: "true", api_key: token });
  if (mediaSourceId) params.set("mediaSourceId", mediaSourceId);
  return `${normalizeServerUrl(server)}/Videos/${encodeURIComponent(itemId)}/stream?${params}`;
}

export function expandTilde(inputPath: string): string {
  if (!inputPath) return inputPath;
  if (inputPath === "~") return os.homedir();
  if (inputPath.startsWith("~/")) {
    return path.join(os.homedir(), inputPath.slice(2));
  }
  return inputPath;
}

export function resolveBinary(customPath: string | undefined, candidates: string[], fallbackName: string): string {
  if (customPath && customPath.trim()) {
    const expanded = expandTilde(customPath.trim());
    if (fs.existsSync(expanded)) return expanded;
  }
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return fallbackName;
}

export function resolveFfmpeg(customFfmpeg?: string): { ffmpegPath: string; ffprobePath: string } {
  const ffmpegPath = resolveBinary(customFfmpeg, FFMPEG_CANDIDATES, "ffmpeg");
  let siblingProbe: string | undefined;
  if (ffmpegPath.includes(path.sep)) {
    const candidate = path.join(path.dirname(ffmpegPath), "ffprobe");
    if (fs.existsSync(candidate)) siblingProbe = candidate;
  }
  const ffprobePath = resolveBinary(siblingProbe, FFPROBE_CANDIDATES, "ffprobe");
  return { ffmpegPath, ffprobePath };
}

export function resolveNodeBinary(): string {
  for (const candidate of NODE_CANDIDATES) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return "node";
}

export function buildExecutionEnv(bypassProxy: boolean): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin", process.env.PATH ?? ""]
      .filter(Boolean)
      .join(":"),
  };

  if (bypassProxy) {
    for (const key of [
      "http_proxy",
      "https_proxy",
      "all_proxy",
      "HTTP_PROXY",
      "HTTPS_PROXY",
      "ALL_PROXY",
      "socks_proxy",
      "SOCKS_PROXY",
    ]) {
      delete env[key];
    }
  } else if (!hasProxyEnv(env)) {
    // Raycast doesn't inherit shell proxy vars; route curl/ffmpeg through the macOS system proxy.
    Object.assign(env, systemProxyEnv());
  }
  return env;
}

export function formatHmsDisplay(sec: number): string {
  const safe = Math.max(0, sec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatFfmpegTimestamp(sec: number): string {
  // Round to whole milliseconds before splitting, so 59.9996s carries into the
  // next minute. Formatting the fractional seconds directly produced "00:00:60.000",
  // which ffmpeg rejects as an invalid duration.
  const totalMs = Math.round(Math.max(0, sec) * 1000);
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

export function formatFileTimeTag(sec: number): string {
  const safe = Math.max(0, sec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}s`;
}

export function sanitizeMovieTitle(rawTitle: string): string {
  const cleaned = rawTitle
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, "_")
    .replace(/^_+|_+$/g, "");
  return cleaned || "Media";
}

export function getUniqueBaseName(saveDir: string, rawBase: string): string {
  let candidate = rawBase;
  let counter = 1;
  while (
    fs.existsSync(path.join(saveDir, `${candidate}_clean.png`)) ||
    fs.existsSync(path.join(saveDir, `${candidate}_subbed.png`)) ||
    fs.existsSync(path.join(saveDir, `${candidate}_layered.svg`)) ||
    fs.existsSync(path.join(saveDir, `${candidate}.mkv`))
  ) {
    candidate = `${rawBase} (${counter})`;
    counter += 1;
  }
  return candidate;
}

export function parseCaptureFlags(rawFlags: string | undefined, defaultMode: SubtitleMode): CaptureFlags {
  const tokens = (rawFlags ?? "")
    .toLowerCase()
    .split(/[\s,|/]+/)
    .filter(Boolean);

  let mode: SubtitleMode = defaultMode;
  if (tokens.includes("sub") || tokens.includes("dual") || tokens.includes("bilingual") || tokens.includes("双语")) {
    mode = "bilingual";
  } else if (tokens.includes("clean") || tokens.includes("raw") || tokens.includes("纯净")) {
    mode = "clean";
  } else if (tokens.includes("primary") || tokens.includes("single")) {
    mode = "primary";
  }

  return {
    mode,
    cinemaBar: false,
    alignTop: false,
  };
}

export function statePaths(supportPath: string) {
  return {
    queueFile: path.join(supportPath, "task_queue.json"),
    historyFile: path.join(supportPath, "history.json"),
    clipInFile: path.join(supportPath, "clip_in.json"),
    projectsDir: path.join(supportPath, "projects"),
  };
}

export function ensureRuntimeDirectories(config: RuntimeConfig): void {
  fs.mkdirSync(config.saveDirectory, { recursive: true });
  fs.mkdirSync(config.supportPath, { recursive: true });
  const paths = statePaths(config.supportPath);
  fs.mkdirSync(paths.projectsDir, { recursive: true });
}
