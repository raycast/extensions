import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export class NativeCatalogError extends Error {
  constructor(
    message: string,
    readonly playbackAttempted = false,
  ) {
    super(message);
    this.name = "NativeCatalogError";
  }
}

export function parseNativeResult(raw: string, songId: string): void {
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(raw);
  } catch {
    throw new NativeCatalogError("The native Music player returned an invalid response.", true);
  }
  if (!result || result.songId !== songId || typeof result.playbackAttempted !== "boolean") {
    throw new NativeCatalogError("The native Music player did not confirm this request.", true);
  }
  if (result.status !== "started" || !result.playbackAttempted) {
    throw new NativeCatalogError(
      typeof result.message === "string" && result.message
        ? result.message
        : "The native Music player could not start playback.",
      result.playbackAttempted,
    );
  }
}

export async function startNativeCatalogSong(songId: string): Promise<void> {
  if (!/^\d+$/.test(songId)) throw new NativeCatalogError("Invalid Apple Music song ID.");
  const app = path.join(environment.assetsPath, "MusicCatalogPlayer.app");
  // Some extension installation paths do not preserve the executable mode.
  await chmod(path.join(app, "Contents/MacOS/MusicCatalogPlayer"), 0o755);
  const directory = await mkdtemp(path.join(tmpdir(), "raycast-music-play-"));
  const output = path.join(directory, "result.json");
  try {
    // LaunchServices is required for TCC to recognize the helper's usage description.
    // Never use a music:// URL: Music unminimizes its window for those URLs.
    try {
      await execFileAsync("/usr/bin/open", ["-g", "-n", "-W", app, "--args", songId, output, String(process.pid)], {
        timeout: 95_000,
        killSignal: "SIGKILL",
        maxBuffer: 64 * 1024,
      });
    } catch (error) {
      const killed = typeof error === "object" && error !== null && "killed" in error && Boolean(error.killed);
      throw new NativeCatalogError(
        error instanceof Error ? error.message : "Could not launch the native Music player.",
        killed,
      );
    }
    let raw: string;
    try {
      raw = await readFile(output, "utf8");
    } catch {
      throw new NativeCatalogError("The native Music player exited without a result.", true);
    }
    parseNativeResult(raw, songId);
  } finally {
    // Also invalidates a still-running helper before it can send a late play command.
    await rm(directory, { recursive: true, force: true });
  }
}
