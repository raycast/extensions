/**
 * ffmpeg concat merge for Tesla camera segments and per-event orchestration.
 */

import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { trash } from "@raycast/api";
import type { CameraMergeResult, ClipSegment, EventMergeResult, MergeOptions, TeslaEvent } from "../types";
import { OutputValidationError } from "./errors";
import { execFileAsync } from "./exec";
import { logger } from "./logger";
import { isValidMergedOutput, isValidMergedOutputSize, shouldOverwriteOutput } from "./merge-readiness";
import { resolveEventOutputDir, resolveMergedOutputFilename } from "./paths";

/**
 * Escapes a path for ffmpeg concat demuxer `file` lines.
 *
 * ffmpeg reads the concat list directly (not via a shell). Backslash-escape
 * special characters per the concat demuxer rules.
 *
 * @see https://ffmpeg.org/ffmpeg-formats.html#concat-1
 */
export function escapeConcatFilePath(filePath: string): string {
  return filePath.replaceAll("\\", "\\\\").replaceAll("'", "\\'").replaceAll(" ", "\\ ");
}

function formatConcatFileLine(filePath: string): string {
  return `file ${escapeConcatFilePath(filePath)}`;
}

async function preserveOutputTimesFromFirstSegment(segments: ClipSegment[], outputPath: string): Promise<void> {
  const firstSegment = segments[0];
  if (!firstSegment) {
    return;
  }

  const sourceStats = await fs.stat(firstSegment.filePath);
  await fs.utimes(outputPath, sourceStats.atime, sourceStats.mtime);
}

async function deleteSourceSegments(segments: ClipSegment[]): Promise<void> {
  const paths = segments.map((s) => s.filePath);
  logger.info("Trashing source segments", { count: paths.length });
  await trash(paths);
}

async function validateOutput(outputPath: string): Promise<void> {
  const stats = await fs.stat(outputPath);
  if (!isValidMergedOutputSize(stats.size)) {
    throw new OutputValidationError(
      stats.size === 0
        ? `Output file is empty: ${outputPath}`
        : `Output file is too small to be valid (${stats.size} bytes): ${outputPath}`,
    );
  }
}

/**
 * Merges ordered segments for one camera via ffmpeg concat demuxer (stream copy).
 *
 * Skips single-segment cameras and existing valid outputs unless overwrite is enabled.
 * Optionally trashes source segments after a successful merge.
 *
 * @param camera - Tesla camera id.
 * @param segments - Time-ordered source clip paths.
 * @param outputPath - Absolute path for the merged MP4.
 * @param options - ffmpeg path, overwrite flags, and delete-after-merge.
 * @param eventDir - Event directory; used for per-output overwrite keys when provided.
 * @returns Per-camera merge result (merged, skipped, or failed).
 */
export async function mergeCameraSegments(
  camera: string,
  segments: ClipSegment[],
  outputPath: string,
  options: MergeOptions,
  eventDir?: string,
): Promise<CameraMergeResult> {
  if (segments.length < 2) {
    logger.debug("Skipping single-segment camera", { camera, segments: segments.length });
    return {
      camera,
      outputPath,
      segmentCount: segments.length,
      status: "skipped-single",
    };
  }

  const hasValidOutput = await isValidMergedOutput(outputPath);
  if (hasValidOutput) {
    const overwrite = eventDir ? shouldOverwriteOutput(eventDir, camera, options) : options.overwriteExisting;
    if (!overwrite) {
      logger.debug("Skipping existing merged output", { camera, outputPath });
      return {
        camera,
        outputPath,
        segmentCount: segments.length,
        status: "skipped-existing",
      };
    }
  } else {
    logger.debug("Merging camera output", {
      camera,
      outputPath: path.basename(outputPath),
      reason: "missing-or-invalid-output",
    });
  }

  const concatFilePath = path.join(os.tmpdir(), `tesla-clips-${Date.now()}-${Math.random().toString(16).slice(2)}.txt`);

  try {
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const concatFileContent = segments
      .map((segment) => formatConcatFileLine(path.resolve(segment.filePath)))
      .join("\n");

    await fs.writeFile(concatFilePath, `${concatFileContent}\n`, "utf8");

    logger.debug("Running ffmpeg concat", {
      camera,
      segments: segments.length,
      outputPath: path.basename(outputPath),
    });

    await execFileAsync(options.ffmpegPath, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFilePath,
      "-map_metadata",
      "0",
      "-c",
      "copy",
      "-movflags",
      "+faststart",
      "-y",
      outputPath,
    ]);

    await validateOutput(outputPath);

    try {
      await preserveOutputTimesFromFirstSegment(segments, outputPath);
    } catch (error) {
      logger.warn("Failed to preserve output timestamps", {
        camera,
        outputPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (options.deleteSourceSegmentsAfterMerge) {
      try {
        await deleteSourceSegments(segments);
      } catch (error) {
        logger.warn("Failed to trash source segments after merge", {
          camera,
          outputPath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logger.info("Merged camera segments", { camera, segments: segments.length, outputPath: path.basename(outputPath) });

    return {
      camera,
      outputPath,
      segmentCount: segments.length,
      status: "merged",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Failed merging camera segments", { camera, outputPath, error: errorMessage });
    return {
      camera,
      outputPath,
      segmentCount: segments.length,
      status: "failed",
      errorMessage,
    };
  } finally {
    await fs.unlink(concatFilePath).catch(() => undefined);
  }
}

/**
 * Merges all cameras for one Tesla event in parallel.
 *
 * @param event - Event with camera segment groups.
 * @param options - Merge configuration including output root and ffmpeg path.
 * @returns Per-camera outputs and event directory reference.
 */
export async function mergeEvent(event: TeslaEvent, options: MergeOptions): Promise<EventMergeResult> {
  const outputDir = resolveEventOutputDir(event.eventDir, event.sourceRoot, options.outputRootPath);
  logger.info("Merging event", {
    eventDir: path.basename(event.eventDir),
    cameras: event.cameras.length,
    outputDir,
  });

  const cameraPromises = event.cameras.map((group) => {
    const outputPath = path.join(outputDir, resolveMergedOutputFilename(group.camera, event.folderName));
    return mergeCameraSegments(group.camera, group.segments, outputPath, options, event.eventDir);
  });

  const outputs = await Promise.all(cameraPromises);

  const merged = outputs.filter((o) => o.status === "merged").length;
  const failed = outputs.filter((o) => o.status === "failed").length;
  logger.info("Event merge completed", {
    eventDir: path.basename(event.eventDir),
    merged,
    failed,
    total: outputs.length,
  });

  return {
    eventDir: event.eventDir,
    outputs,
  };
}
