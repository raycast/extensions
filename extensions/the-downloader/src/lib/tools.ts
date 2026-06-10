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
  ffmpeg: { id: "ffmpeg", installMethod: packageManagerMethod },
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

/** The winget package ID for an executable. Falls back to yt-dlp's package, which bundles ffmpeg/ffprobe on Windows. */
export function wingetIdFor(executable: string): string {
  return (TOOLS as Record<string, ToolSpec | undefined>)[executable]?.wingetId ?? "yt-dlp.yt-dlp";
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
