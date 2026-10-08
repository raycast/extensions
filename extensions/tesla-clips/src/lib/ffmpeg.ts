/**
 * ffmpeg executable discovery and availability checks.
 */

import { FfmpegNotFoundError } from "./errors";
import { execFileAsync } from "./exec";
import { logger } from "./logger";
import { cleanPath } from "./paths";

/**
 * Runs `executable -version` to verify the binary exists and is runnable.
 *
 * @param executablePath - Absolute or PATH-resolved executable path.
 * @returns `false` for ENOENT/EACCES; `true` otherwise (including version check failures).
 */
export async function isExecutableAvailable(executablePath: string): Promise<boolean> {
  try {
    await execFileAsync(executablePath, ["-version"], { timeout: 5000 });
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EACCES") {
      return false;
    }
    return true;
  }
}

/**
 * Resolves the ffmpeg binary from preferences and common install locations.
 *
 * @param preferredPath - Optional full path from extension preferences.
 * @returns Absolute path to a working ffmpeg executable.
 * @throws {@link FfmpegNotFoundError} when no candidate is available.
 */
export async function resolveFfmpegExecutable(preferredPath?: string): Promise<string> {
  const cleanedPreferredPath = cleanPath(preferredPath);

  const candidates = [
    cleanedPreferredPath,
    "ffmpeg",
    "/opt/homebrew/bin/ffmpeg",
    "/usr/local/bin/ffmpeg",
    "/usr/bin/ffmpeg",
  ].filter((candidate): candidate is string => Boolean(candidate));

  const uniqueCandidates = [...new Set(candidates)];
  logger.debug("Resolving ffmpeg from candidates", { candidates: uniqueCandidates });

  for (const candidate of uniqueCandidates) {
    if (await isExecutableAvailable(candidate)) {
      logger.info("Resolved ffmpeg executable", { ffmpegPath: candidate });
      return candidate;
    }
  }

  logger.error("ffmpeg not found at any candidate path", { candidates: uniqueCandidates });
  throw new FfmpegNotFoundError("ffmpeg not found", { candidates: uniqueCandidates });
}
