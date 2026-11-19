import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";
import { runCommand } from "./command-runner";
import { buildExecutionEnv } from "./env";
import { ScreenshotQueueTask } from "./types";

const MAX_SEGMENT_BYTES = 2048 * 1024 * 1024;

export interface DiscSubtitleLanguage {
  pid: number;
  language: string;
}

export interface DiscPlaylistCandidate {
  playlist: number;
  durationSec: number;
  chapters: number;
  clips: number;
  segments: Array<{ clipId: string; inTime: number; outTime: number; startTime: number }>;
}

/** The caller may batch all candidates when canAutoBatch is true. */
export class DiscPlaylistCandidatesError extends Error {
  readonly canAutoBatch: boolean;

  constructor(readonly candidates: DiscPlaylistCandidate[]) {
    super(
      "The disc has multiple different playlists. Up to 3 candidates are captured separately; with more than 3 the task stops to avoid downloading too many versions at once.",
    );
    this.name = "DiscPlaylistCandidatesError";
    this.canAutoBatch = candidates.length > 0 && candidates.length <= 3;
  }
}

interface ReaderResult {
  version: number;
  targetSec: number;
  coarseSec: number;
  sourceTargetPts: number;
  bytes: number;
  videoPid: number;
  pgStreams: DiscSubtitleLanguage[];
}

function validPid(pid: number): boolean {
  return Number.isInteger(pid) && pid > 0 && pid < 8191;
}

function stopped(error: unknown): boolean {
  return error instanceof Error && error.message === "Task stopped manually";
}

/** Extract a bounded, local TS segment with original source PTS.
 * HTTP inputs must already be numeric-loopback budgeted range proxy URLs.
 * targetSec/coarseSec are source PTS seconds for -copyts consumers, not offsets
 * from the beginning of the output file. No media-engine integration here.
 */
export async function prepareDiscSource(
  task: ScreenshotQueueTask,
  inputTarget: string,
  projectDir: string,
  onLocated?: () => void,
  preview = false,
): Promise<{
  mediaPath: string;
  targetSec: number;
  coarseSec: number;
  videoPid: number;
  subtitleLanguages: DiscSubtitleLanguage[];
}> {
  const { config, probe } = task;
  const { playlist: playlistId, durationSec: titleDurationSec } = probe;
  if (!Number.isFinite(probe.positionSec) || probe.positionSec < 0 || probe.positionSec > 86400000) {
    throw new Error("Blu-ray target time must be finite, nonnegative, and title-relative.");
  }
  if (playlistId !== undefined && (!Number.isInteger(playlistId) || playlistId < 0 || playlistId > 99999)) {
    throw new Error("Blu-ray playlistId must be an integer from 0 to 99999.");
  }
  if (
    titleDurationSec !== undefined &&
    (!Number.isFinite(titleDurationSec) || titleDurationSec <= 0 || titleDurationSec > 86400000)
  ) {
    throw new Error("Blu-ray titleDurationSec must be a positive finite duration.");
  }
  if (!inputTarget || inputTarget.includes("\0")) throw new Error("Blu-ray source path is empty or invalid.");
  if (inputTarget.includes("://")) {
    let url: URL;
    try {
      url = new URL(inputTarget);
    } catch {
      throw new Error("Invalid Blu-ray proxy URL.");
    }
    if (
      url.protocol !== "http:" ||
      !["127.0.0.1", "[::1]"].includes(url.hostname) ||
      url.username ||
      url.password ||
      url.hash
    ) {
      throw new Error("Blu-ray HTTP input requires a numeric-loopback bounded range proxy URL.");
    }
  }

  const source = path.join(config.assetsPath, "disc-reader.c");
  let sourceBytes: Buffer;
  try {
    sourceBytes = await fs.readFile(source);
  } catch {
    throw new Error("Blu-ray native helper source is missing from extension assets.");
  }
  const cacheDir = path.join(config.supportPath, "bin-cache");
  await fs.mkdir(cacheDir, { recursive: true });
  const digest = createHash("sha256").update(sourceBytes).update(process.arch).digest("hex").slice(0, 20);
  const binary = path.join(cacheDir, `disc-reader-${digest}`);
  const env = buildExecutionEnv(true);
  const prefix = existsSync("/opt/homebrew/include/libbluray/bluray.h") ? "/opt/homebrew" : "/usr/local";
  try {
    await fs.access(binary, fs.constants.X_OK);
  } catch {
    const temporary = `${binary}-${randomUUID()}`;
    try {
      // Homebrew's libbluray may use pkg-config for transitive link flags.
      // Parse only ordinary flags, never evaluate shell substitutions/quoting.
      let flags: string[] = [];
      try {
        const result = await runCommand(`${prefix}/bin/pkg-config`, ["--cflags", "--libs", "libbluray", "libcurl"], {
          env,
          maxBuffer: 64 * 1024,
        });
        const tokens = result.stdout.trim().split(/\s+/).filter(Boolean);
        if (tokens.every((flag) => /^[-A-Za-z0-9_./,+=:]+$/.test(flag))) flags = tokens;
      } catch (error) {
        if (stopped(error)) throw error;
        // Standard Homebrew include/library paths below also work without pkg-config.
      }
      await runCommand(
        "/usr/bin/clang",
        [
          "-std=c11",
          "-O2",
          "-Wall",
          "-Wextra",
          "-Werror",
          `-I${prefix}/include`,
          `-L${prefix}/lib`,
          `-Wl,-rpath,${prefix}/lib`,
          source,
          "-o",
          temporary,
          ...flags,
          "-lbluray",
          "-lcurl",
        ],
        { env, maxBuffer: 128 * 1024 },
      );
      await fs.rename(temporary, binary);
    } catch (error) {
      if (stopped(error)) throw error;
      throw new Error(
        "Couldn't build the disc reader. It needs the Xcode Command Line Tools plus libbluray, libudfread, and curl from Homebrew. See the README for setup.",
      );
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  await fs.mkdir(projectDir, { recursive: true });
  const mediaPath = path.join(projectDir, `_disc-${randomUUID()}.ts`);
  const args = [inputTarget, mediaPath, String(probe.positionSec)];
  if (preview) args.push("--preview", "1");
  if (playlistId !== undefined) args.push("--playlist", String(playlistId));
  if (titleDurationSec !== undefined) args.push("--duration", String(titleDurationSec));
  try {
    let stdout: string;
    try {
      const result = await runCommand(binary, args, {
        env,
        maxBuffer: 1024 * 1024,
        onStderrLine: (line) => {
          if (line === "disc-stage: reading target segment") onLocated?.();
        },
      });
      stdout = result.stdout;
      await fs.writeFile(
        path.join(projectDir, "disc-stages.log"),
        result.stderr
          .split("\n")
          .filter((line) => line.startsWith("disc-stage:"))
          .join("\n"),
      );
    } catch (error) {
      if (stopped(error)) throw error;
      // execFile errors include argv (and potentially the proxy URL). Only
      // expose our fixed helper messages, never the command or raw diagnostics.
      const stderr = (error as { stderr?: unknown })?.stderr;
      if (typeof stderr === "string")
        await fs.writeFile(
          path.join(projectDir, "disc-stages.log"),
          stderr
            .split("\n")
            .filter((line) => line.startsWith("disc-stage:"))
            .join("\n"),
        );
      const detail =
        typeof stderr === "string" ? stderr.split("\n").find((line) => line.startsWith("disc-reader: ")) : undefined;
      if (detail?.includes("ambiguous playlists")) {
        const candidates =
          typeof stderr === "string"
            ? stderr
                .split("\n")
                .filter((line) => line.startsWith("disc-candidate: "))
                .map((line) => JSON.parse(line.slice("disc-candidate: ".length)))
            : [];
        await fs.writeFile(path.join(projectDir, "playlists.json"), JSON.stringify(candidates));
        throw new DiscPlaylistCandidatesError(candidates);
      }
      if (detail?.includes("crosses a playlist clip boundary"))
        throw new Error(
          "The capture point is too close to a Blu-ray clip boundary, and joining timelines across clips isn't supported yet. Reading stopped.",
        );
      if (detail?.includes("no matching playlist"))
        throw new Error(
          "No disc playlist matches the duration reported by the player. Specify one explicitly with playlist=<number>.",
        );
      throw new Error(detail ?? "The disc reader couldn't run. Check that libbluray and libcurl are installed.");
    }
    const metadata = JSON.parse(stdout) as ReaderResult;
    const stat = await fs.stat(mediaPath);
    if (
      metadata.version !== 1 ||
      !validPid(metadata.videoPid) ||
      !Array.isArray(metadata.pgStreams) ||
      metadata.pgStreams.some(
        (stream) =>
          !stream ||
          !validPid(stream.pid) ||
          typeof stream.language !== "string" ||
          !/^[a-z]{3}$/.test(stream.language),
      ) ||
      !Number.isSafeInteger(metadata.sourceTargetPts) ||
      !Number.isFinite(metadata.targetSec) ||
      !Number.isFinite(metadata.coarseSec) ||
      metadata.coarseSec < 0 ||
      metadata.coarseSec > metadata.targetSec ||
      Math.abs(metadata.targetSec - metadata.sourceTargetPts / 90000) > 0.000001 ||
      !Number.isSafeInteger(metadata.bytes) ||
      metadata.bytes <= 0 ||
      metadata.bytes > MAX_SEGMENT_BYTES ||
      metadata.bytes % 188 !== 0 ||
      stat.size !== metadata.bytes ||
      !stat.isFile()
    ) {
      throw new Error("Blu-ray helper returned an invalid segment or timestamp mapping.");
    }
    return {
      mediaPath,
      targetSec: metadata.targetSec,
      coarseSec: metadata.coarseSec,
      videoPid: metadata.videoPid,
      subtitleLanguages: metadata.pgStreams,
    };
  } catch (error) {
    await fs.rm(mediaPath, { force: true });
    throw error;
  }
}
