import { isWindows } from "./binary.js";

export type InstallMethod = "homebrew" | "winget" | "managed-binary";
export type ToolId = "yt-dlp" | "ffmpeg" | "gallery-dl" | "deno" | "spotdl" | "monolith";

export type ToolSpec = {
  id: ToolId;
  installMethod: InstallMethod;
  /** winget package identifier, for the Windows installer/updater. Absent for managed binaries. */
  wingetId?: string;
};

const packageManagerMethod: InstallMethod = isWindows ? "winget" : "homebrew";

/** Every external CLI the extension installs or updates as a unit, and how each is obtained on this platform. */
export const TOOLS: Record<ToolId, ToolSpec> = {
  "yt-dlp": { id: "yt-dlp", installMethod: packageManagerMethod, wingetId: "yt-dlp.yt-dlp" },
  ffmpeg: { id: "ffmpeg", installMethod: packageManagerMethod, wingetId: "yt-dlp.FFmpeg" },
  "gallery-dl": { id: "gallery-dl", installMethod: packageManagerMethod, wingetId: "mikf.gallery-dl" },
  deno: { id: "deno", installMethod: packageManagerMethod, wingetId: "DenoLand.Deno" },
  spotdl: { id: "spotdl", installMethod: "managed-binary" },
  monolith: { id: "monolith", installMethod: packageManagerMethod, wingetId: "Y2Z.Monolith" },
};

/** Homebrew formula names — the tools the macOS auto-installer passes to `brew install`. */
export const HOMEBREW_FORMULAE: string[] = Object.values(TOOLS)
  .filter((tool) => tool.installMethod === "homebrew")
  .map((tool) => tool.id);

/** Distinct winget package IDs — the packages the Windows installer/updater operate on. */
export const WINGET_PACKAGES: string[] = [
  ...new Set(
    Object.values(TOOLS)
      .filter((tool): tool is ToolSpec & { wingetId: string } => tool.installMethod === "winget" && !!tool.wingetId)
      .map((tool) => tool.wingetId),
  ),
];

/** True when `executable` is an extension-managed binary (downloaded, not installed via a package manager). */
export function isManagedTool(executable: string): boolean {
  return (TOOLS as Record<string, ToolSpec | undefined>)[executable]?.installMethod === "managed-binary";
}

/**
 * The winget package ID for an executable. ffprobe ships in ffmpeg's package
 * (yt-dlp.FFmpeg). Unknown names fall back to yt-dlp's package.
 */
export function wingetIdFor(executable: string): string {
  const id = executable === "ffprobe" ? "ffmpeg" : executable;
  return (TOOLS as Record<string, ToolSpec | undefined>)[id]?.wingetId ?? "yt-dlp.yt-dlp";
}

/** The friendly tool name for a winget package ID (e.g. "Y2Z.Monolith" → "monolith"). Returns the input unchanged if it is not a winget package ID (e.g. a Homebrew formula name or "spotdl"). */
export function friendlyNameFor(name: string): string {
  return Object.values(TOOLS).find((tool) => tool.wingetId === name)?.id ?? name;
}

/** The Homebrew formula name for an executable. ffprobe ships inside the ffmpeg formula, so it maps there. Returns the input unchanged if no tool entry matches. */
export function homebrewFormulaFor(executable: string): string {
  if (executable === "ffprobe") return "ffmpeg";
  return (TOOLS as Record<string, ToolSpec | undefined>)[executable]?.id ?? executable;
}

/**
 * winget's UPDATE_NOT_APPLICABLE exit code (0x8A15002B) — returned by `winget
 * install` when the package is already installed and by `winget upgrade` when
 * no upgrade is available. Not a failure for our flows. Node reports Windows
 * exit codes as unsigned 32-bit values, but the signed form is what winget's
 * docs (and a shell's `$LASTEXITCODE`) show — accept both so the check can't
 * silently break on either representation.
 */
const WINGET_UPDATE_NOT_APPLICABLE_CODES = new Set([2316632107, -1978335189]);

/** True when a winget exit code means "already installed / no applicable upgrade". */
export function isWingetUpdateNotApplicable(exitCode: number | undefined): boolean {
  return exitCode !== undefined && WINGET_UPDATE_NOT_APPLICABLE_CODES.has(exitCode);
}

export type ToolInfo = { name: string; purpose: string; homepage: string };

/** What each tool does for the extension, for the Installer and the Updater. */
export const TOOL_INFO: Record<ToolId, ToolInfo> = {
  "yt-dlp": {
    name: "yt-dlp",
    purpose: "Downloads video and audio from YouTube and 1,000+ sites",
    homepage: "https://github.com/yt-dlp/yt-dlp",
  },
  ffmpeg: {
    name: "ffmpeg",
    purpose: "Merges video and audio streams and converts audio",
    homepage: "https://ffmpeg.org",
  },
  "gallery-dl": {
    name: "gallery-dl",
    purpose: "Downloads image galleries from Reddit, Instagram, Pinterest and more",
    homepage: "https://github.com/mikf/gallery-dl",
  },
  deno: {
    name: "Deno",
    purpose: "Runs the JavaScript yt-dlp needs for YouTube",
    homepage: "https://deno.com",
  },
  spotdl: {
    name: "spotDL",
    purpose: "Downloads Spotify tracks, albums and playlists",
    homepage: "https://github.com/spotDL/spotify-downloader",
  },
  monolith: {
    name: "monolith",
    purpose: "Saves complete webpages as a single HTML file",
    homepage: "https://github.com/Y2Z/monolith",
  },
};

/** Tool info for an executable, winget package ID or Homebrew formula (ffprobe ships with ffmpeg). */
export function toolInfoFor(name: string): ToolInfo {
  const id = friendlyNameFor(name === "ffprobe" ? "ffmpeg" : name);
  return (TOOL_INFO as Record<string, ToolInfo | undefined>)[id] ?? { name, purpose: "", homepage: "" };
}
