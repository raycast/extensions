import fs from "node:fs";
import { exportSignatures } from "./export-sync";
import path from "node:path";
import {
  buildExecutionEnv,
  formatFfmpegTimestamp,
  formatFileTimeTag,
  formatHmsDisplay,
  getUniqueBaseName,
  sanitizeMovieTitle,
  statePaths,
} from "./env";
import { renderTransparentTextOverlayPng, TextOverlayLayerInput } from "./macos-native";
import { inspectContainerMetadata } from "./probe";
import { applyInitialLayerSelection, buildLayeredSvg, findActiveSubtitleText } from "./subtitles";
import {
  CaptureProjectManifest,
  ClipQueueTask,
  ComposeQueueTask,
  ExtractedLayer,
  HistoryEntry,
  PlaybackProbeResult,
  ScreenshotQueueTask,
  SubtitleStreamMeta,
} from "./types";

import { runCommand as execFileAsync } from "./command-runner";

import { inspectMediaResponse } from "./media-response";
import { openRangeSource } from "./range-source";
import { openRemoteWindow, RemoteReadStats, RemoteWindowResult, RemoteWindowUnsupported } from "./remote-window";
import { describeTaskError } from "./task-errors";
import { assertReadableVideoSource } from "./source-format";
import { readPgsCanvas } from "./pgs-canvas";
import { pngSize } from "./hdr-overlay";
import { pickSourceStart, selectDisplayedFrame, verifyDecodedFrame } from "./frame-selection";
import { MAX_SEGMENT_BYTES, SegmentCache, SegmentLease, segmentCacheKey } from "./segment-cache";
import { acquireSourceLease, SourcePreparationLease } from "./source-lease";
import { computeMediaBudget } from "./media-budget";
const PREROLL_SECONDS = 8.0;
const POSTROLL_SECONDS = 8.0;
// The frame and its subtitles only need time before the target; a short tail
// still satisfies the segment cache's coverage check for repeat captures.
const WINDOW_POSTROLL_SECONDS = 1.5;

function remoteInputFlags(isRemote: boolean): string[] {
  if (!isRemote) return [];
  return [
    "-reconnect",
    "1",
    "-reconnect_streamed",
    "1",
    "-reconnect_on_network_error",
    "1",
    "-rw_timeout",
    "210000000",
  ];
}

function mergeSubtitleStreams(
  probedStreams: SubtitleStreamMeta[],
  sessionStreams: SubtitleStreamMeta[],
): SubtitleStreamMeta[] {
  if (probedStreams.length === 0) return sessionStreams;
  if (sessionStreams.length === 0) return probedStreams;

  return probedStreams.map((localSt) => {
    const match = sessionStreams.find((s) => s.subOrdinal === localSt.subOrdinal);
    if (!match) return localSt;
    return {
      ...localSt,
      // Keep original container stream index for display clarity, while subOrdinal addresses 0:s:k
      index: match.index ?? localSt.index,
      language: localSt.language !== "und" ? localSt.language : match.language,
      title: match.title || localSt.title,
      isChinese: localSt.isChinese || match.isChinese,
      isEnglish: localSt.isEnglish || match.isEnglish,
    };
  });
}

async function hasVisibleAlphaPixels(ffmpegPath: string, pngPath: string, env: NodeJS.ProcessEnv): Promise<boolean> {
  if (!fs.existsSync(pngPath)) return false;
  try {
    const { stderr } = await execFileAsync(
      ffmpegPath,
      ["-hide_banner", "-i", pngPath, "-vf", "alphaextract,bbox", "-f", "null", "-"],
      { env, timeout: 8000 },
    );
    return stderr.includes("crop=");
  } catch {
    throw new Error("Couldn't determine subtitle transparency; a read failure can't be treated as no dialogue.");
  }
}

export async function recomposeCaptureOutputs(
  manifest: CaptureProjectManifest,
  _supportPath: string,
  ffmpegPath: string,
  bypassProxy = true,
  mergeIntoDisk = false,
): Promise<void> {
  if (manifest.exportSignatures) {
    for (const file of [manifest.cleanPngPath, manifest.subbedPngPath, manifest.layeredSvgPath]) {
      const expected = manifest.exportSignatures[file];
      if (!expected) continue;
      let current = "";
      try {
        const stat = fs.statSync(file);
        current = `${stat.size}:${stat.mtimeMs}`;
      } catch {
        /* Deleted outside. */
      }
      if (current !== expected)
        throw new Error(
          "The exported file was modified or deleted locally. Layer re-rendering stopped to avoid overwriting external edits. Keep the external version or capture again to start a new project.",
        );
    }
  }
  const env = buildExecutionEnv(bypassProxy);
  const { width, height, isPq, colorPrimaries, colorTransfer, colorSpace } = manifest.colorInfo;
  const barPad = manifest.cinemaBar ? Math.round(height * 0.12) : 0;
  const totalHeight = height + barPad * 2;
  const videoY = barPad;

  // Render into temporaries and publish only after every step succeeded, so a
  // failed render never leaves new files that later look like external edits.
  const stamp = `${process.pid}-${Date.now()}`;
  const svgTemp = `${manifest.layeredSvgPath}.${stamp}.tmp`;
  const pngTemp = `${manifest.subbedPngPath}.${stamp}.tmp.png`;
  fs.writeFileSync(svgTemp, buildLayeredSvg(manifest), "utf-8");

  // 2. Build 16-bit HDR-preserving _subbed.png
  const visibleBitmaps = manifest.layers.filter(
    (l) =>
      l.visible &&
      l.kind === "bitmap" &&
      l.bitmapFilename &&
      fs.existsSync(path.join(manifest.projectDir, l.bitmapFilename)),
  );
  const visibleTexts = manifest.layers.filter(
    (l) => l.visible && l.kind === "text" && (l.text ?? "").trim().length > 0,
  );

  let tempTextPng: string | null = null;
  if (visibleTexts.length > 0) {
    tempTextPng = path.join(manifest.projectDir, `_text_overlay_${Date.now()}.png`);
    const specs: TextOverlayLayerInput[] = visibleTexts.map((l) => ({
      text: l.text ?? "",
      fontFamily: l.fontFamily || "PingFang SC",
      fontSize: l.fontSize ?? Math.max(28, Math.round(height * 0.044)),
      fillHex: l.fillColor || "#FFFFFF",
      strokeHex: l.strokeColor || "#000000",
      yOffset: l.yOffset,
      alignTop: manifest.alignTop,
    }));
    try {
      await renderTransparentTextOverlayPng(width, totalHeight, specs, tempTextPng);
    } catch (error) {
      fs.rmSync(svgTemp, { force: true });
      throw new Error(
        `Couldn't render the text subtitles, so the image wasn't saved. ${error instanceof Error ? error.message : ""}`.trim(),
      );
    }
  }

  try {
    if (visibleBitmaps.length === 0 && !tempTextPng && barPad === 0) {
      fs.copyFileSync(manifest.cleanPngPath, pngTemp);
    } else {
      const { compositeCapturePng } = await import("./hdr-overlay");
      await compositeCapturePng({
        ffmpegPath,
        env,
        backgroundPath: manifest.cleanPngPath,
        outputPath: pngTemp,
        width,
        height,
        barPad,
        isPq,
        colorPrimaries,
        colorTransfer,
        colorSpace,
        overlays: [
          ...visibleBitmaps.map((bmp) => ({
            path: path.join(manifest.projectDir, bmp.bitmapFilename!),
            y: videoY + (manifest.alignTop ? -Math.round(height * 0.72) : 0) + bmp.yOffset,
          })),
          ...(tempTextPng ? [{ path: tempTextPng, y: 0 }] : []),
        ],
      });
    }
    if (!fs.existsSync(pngTemp) || fs.statSync(pngTemp).size === 0)
      throw new Error("Couldn't render the subtitled image.");
    fs.renameSync(pngTemp, manifest.subbedPngPath);
    fs.renameSync(svgTemp, manifest.layeredSvgPath);
  } finally {
    if (tempTextPng) fs.rmSync(tempTextPng, { force: true });
    fs.rmSync(pngTemp, { force: true });
    fs.rmSync(svgTemp, { force: true });
  }

  // Persist manifest for instant re-editing in FrameCraft Studio
  manifest.exportSignatures = exportSignatures({
    id: manifest.id,
    type: "screenshot",
    movieName: manifest.movieName,
    source: manifest.source,
    createdAt: manifest.createdAt,
    timestampLabel: manifest.timestampFormatted,
    cleanPngPath: manifest.cleanPngPath,
    subbedPngPath: manifest.subbedPngPath,
    layeredSvgPath: manifest.layeredSvgPath,
  });
  const manifestFile = path.join(manifest.projectDir, "manifest.json");
  let persisted: CaptureProjectManifest = manifest;
  if (mergeIntoDisk) {
    // Studio edits may land while this export runs; keep them and only record the new signatures.
    try {
      const current = JSON.parse(fs.readFileSync(manifestFile, "utf-8")) as CaptureProjectManifest;
      if (current.id === manifest.id) persisted = { ...current, exportSignatures: manifest.exportSignatures };
    } catch {
      /* Fall back to the exported state. */
    }
  }
  fs.writeFileSync(manifestFile, JSON.stringify(persisted, null, 2), "utf-8");
}

export async function executeScreenshotTask(
  task: ScreenshotQueueTask,
  onStage?: (stage: string) => void,
): Promise<HistoryEntry> {
  const { config, probe, flags } = task;
  assertReadableVideoSource(probe);
  const env = buildExecutionEnv(config.bypassProxy);
  let budget = computeMediaBudget(probe);
  // Local files can be measured exactly; remote sizes come from the media server
  // or the first Content-Range response and are re-applied after inspection.
  if (!probe.isRemote && !probe.sizeBytes) {
    try {
      const stat = fs.statSync(probe.mediaTarget);
      if (stat.isFile() && stat.size > 0) budget = computeMediaBudget({ ...probe, sizeBytes: stat.size });
    } catch {
      /* Unreadable size keeps the default budget. */
    }
  }
  const { projectsDir } = statePaths(config.supportPath);

  let targetSec = Math.max(0, probe.positionSec);
  let coarseSec = Math.max(0, targetSec - PREROLL_SECONDS);
  let endWindowSec = targetSec + POSTROLL_SECONDS;

  const projectDir = path.join(projectsDir, task.id);
  fs.mkdirSync(projectDir, { recursive: true });

  let workingMediaPath = probe.mediaTarget;
  let tempPrerollMkv: string | null = null;
  let usedPrerollCopy = false;
  const cache = new SegmentCache(config.supportPath);
  const cacheKey = () =>
    segmentCacheKey({
      server: config.jellyfinUrl,
      source: probe.source,
      mediaSourceId: probe.mediaSourceId,
      itemId: probe.itemId,
      url: probe.mediaTarget,
      disc: false,
    });
  let segmentLease: SegmentLease | undefined;
  let preparationLease: SourcePreparationLease | undefined;
  let rangeSource: Awaited<ReturnType<typeof openRangeSource>> | undefined;
  let progressTimer: ReturnType<typeof setInterval> | undefined;
  const cacheStats = { source: cacheKey(), hits: 0, misses: 0, waited: false };
  try {
    if (probe.isRemote) {
      onStage?.("Waiting for another segment of the same video to finish preparing…");
      preparationLease = await acquireSourceLease(config.supportPath, cacheKey());
      cacheStats.waited = preparationLease.waited;
      segmentLease = await cache.find(cacheKey(), probe.positionSec);
    }
    if (preparationLease) {
      if (segmentLease) cacheStats.hits++;
      else cacheStats.misses++;
    }
    if (segmentLease) await preparationLease?.release();

    // TS/MKV: locate and download only the target window, then work locally.
    // Other containers fall back to FFmpeg reading through the budgeted proxy.
    let windowResult: RemoteWindowResult | undefined;
    if (probe.isRemote && !segmentLease) {
      onStage?.("Analyzing remote video file structure…");
      const writeProgress = (stats: RemoteReadStats) =>
        fs.writeFileSync(
          path.join(projectDir, "read-progress.json"),
          JSON.stringify({ bytes: stats.bytes, requests: stats.requests, updatedAt: Date.now() }),
        );
      const session = await openRemoteWindow({
        url: probe.mediaTarget,
        targetPlayerSec: targetSec,
        prerollSec: PREROLL_SECONDS,
        postrollSec: WINDOW_POSTROLL_SECONDS,
        durationHintSec: probe.durationSec,
        workDir: projectDir,
        ffprobePath: config.ffprobePath,
        env,
        bypassProxy: config.bypassProxy,
        maxBytes: budget.maxRangeBytes,
        maxWindowBytes: MAX_SEGMENT_BYTES,
        onProgress: writeProgress,
        onStage,
      });
      try {
        if (session.kind === "disc") assertReadableVideoSource({ ...probe, container: "iso" });
        else if (session.kind === "ts" || session.kind === "mkv") {
          try {
            windowResult = await session.fetch();
          } catch (error) {
            if (!(error instanceof RemoteWindowUnsupported)) throw error;
            onStage?.(`Couldn't seek by index (${error.message}); reading with FFmpeg instead…`);
          }
        }
      } finally {
        session.close();
        fs.writeFileSync(path.join(projectDir, "read-stats.json"), JSON.stringify(session.stats));
      }
    }

    rangeSource =
      probe.isRemote && !segmentLease && !windowResult
        ? await openRangeSource(probe.mediaTarget, probe, config.bypassProxy)
        : undefined;
    const inputTarget = rangeSource?.url ?? probe.mediaTarget;
    workingMediaPath = inputTarget;
    progressTimer = rangeSource
      ? setInterval(() => {
          const stats = rangeSource!.stats;
          fs.writeFileSync(
            path.join(projectDir, "read-progress.json"),
            JSON.stringify({ bytes: stats.bytes, requests: stats.requests, updatedAt: Date.now() }),
          );
        }, 1000)
      : undefined;

    // 1. For remote HTTP streams, pull a single lossless pre-roll window [T-8s, T+1s] with -copyts
    //    so exact container PTS timestamps are preserved AND all 7+ subtitle tracks are read locally!
    if (segmentLease) {
      onStage?.("Reusing local video segment…");
      workingMediaPath = segmentLease.mediaPath;
      targetSec = segmentLease.targetSec;
      coarseSec = segmentLease.coarseSec;
      usedPrerollCopy = true;
    } else if (windowResult) {
      // coarseSec stays on the player clock here; it is shifted to the source clock below.
      workingMediaPath = windowResult.mediaPath;
      tempPrerollMkv = windowResult.mediaPath;
      targetSec = windowResult.sourceTargetSec;
      usedPrerollCopy = true;
    } else if (probe.isRemote) {
      onStage?.("Checking that the server returns a video file…");
      await inspectMediaResponse(inputTarget);
      budget = computeMediaBudget(probe, rangeSource?.stats.totalBytes);
      // Player positions and `ffmpeg -ss` are both relative to the container
      // start_time (earliest stream). The copyts output keeps the source clock,
      // so the target must use the same container offset — not the video
      // stream's own start, which shifted captures on files whose video starts
      // after audio/subtitles (common in TS/M2TS). See pickSourceStart.
      const timing = await execFileAsync(
        config.ffprobePath,
        [
          "-v",
          "error",
          "-select_streams",
          "v:0",
          "-show_entries",
          "stream=start_time:format=start_time",
          "-of",
          "json",
          inputTarget,
        ],
        { env, timeout: budget.probeTimeoutMs, maxBuffer: 1024 * 1024 },
      );
      const sourceStart = pickSourceStart(JSON.parse(timing.stdout));
      targetSec += sourceStart;
      endWindowSec = targetSec + POSTROLL_SECONDS;
      onStage?.("Downloading video near the target frame…");
      const candidatePreroll = path.join(projectDir, "_preroll.mkv");
      const videoPart = path.join(projectDir, "_preroll_video.mkv");
      const subtitlePart = path.join(projectDir, "_preroll_subs.mkv");
      tempPrerollMkv = candidatePreroll;
      const windowArgs = [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        ...remoteInputFlags(true),
        "-ss",
        formatFfmpegTimestamp(coarseSec),
        "-copyts",
        "-i",
        inputTarget,
        "-to",
        formatFfmpegTimestamp(endWindowSec),
      ];
      try {
        // A mapped subtitle track with no packet after -to keeps FFmpeg demuxing
        // to EOF (the whole film over HTTP), so video and subtitles are copied in
        // separate passes. Containers that index samples (MP4/MOV) skip unmapped
        // video bytes in the subtitle pass.
        try {
          await execFileAsync(
            config.ffmpegPath,
            [
              ...windowArgs,
              "-map",
              "0:v:0",
              "-c:v",
              "copy",
              "-avoid_negative_ts",
              "disabled",
              "-fs",
              String(MAX_SEGMENT_BYTES),
              videoPart,
            ],
            { env, timeout: budget.prerollTimeoutMs },
          );
        } catch (error) {
          if (error instanceof Error && error.message.startsWith("Step timed out after ")) throw error;
          throw new Error(
            `Couldn't read the source video; subtitle compositing didn't start.\n${describeTaskError(error, task)}`,
          );
        }
        if (!fs.existsSync(videoPart) || fs.statSync(videoPart).size <= 16_384)
          throw new Error("The downloaded segment is empty or incomplete, so no frame could be captured.");
        rangeSource?.markLocated();

        let haveSubtitles = false;
        if (probe.subtitles.length > 0 || probe.source !== "jellyfin-remote") {
          onStage?.("Reading subtitles near the target frame…");
          const codecs = probe.subtitles.some((sub) => sub.codec === "mov_text") ? ["srt"] : ["copy", "srt"];
          for (const codec of codecs) {
            try {
              await execFileAsync(
                config.ffmpegPath,
                [...windowArgs, "-map", "0:s", "-c:s", codec, "-avoid_negative_ts", "disabled", subtitlePart],
                { env, timeout: budget.prerollTimeoutMs },
              );
              haveSubtitles = fs.existsSync(subtitlePart) && fs.statSync(subtitlePart).size > 0;
              break;
            } catch (error) {
              fs.rmSync(subtitlePart, { force: true });
              if (error instanceof Error && error.message === "Task stopped manually") throw error;
            }
          }
        }
        if (haveSubtitles) {
          await execFileAsync(
            config.ffmpegPath,
            [
              "-hide_banner",
              "-loglevel",
              "error",
              "-y",
              "-copyts",
              "-i",
              videoPart,
              "-i",
              subtitlePart,
              "-map",
              "0",
              "-map",
              "1",
              "-c",
              "copy",
              "-avoid_negative_ts",
              "disabled",
              candidatePreroll,
            ],
            { env, timeout: budget.probeTimeoutMs },
          );
        } else {
          fs.renameSync(videoPart, candidatePreroll);
        }
        workingMediaPath = candidatePreroll;
        usedPrerollCopy = true;
      } finally {
        fs.rmSync(videoPart, { force: true });
        fs.rmSync(subtitlePart, { force: true });
      }
    }

    if (!segmentLease && probe.isRemote) {
      coarseSec += targetSec - probe.positionSec;
      if (!usedPrerollCopy)
        throw new Error("The downloaded segment is empty or incomplete, so no frame could be captured.");
    }
    if (!segmentLease && tempPrerollMkv) {
      segmentLease = await cache.store({
        key: cacheKey(),
        mediaPath: tempPrerollMkv,
        titleTarget: probe.positionSec,
        sourceTarget: targetSec,
        ffprobePath: config.ffprobePath,
        env,
        timeoutMs: budget.probeTimeoutMs,
      });
      if (segmentLease) {
        workingMediaPath = segmentLease.mediaPath;
        tempPrerollMkv = null;
        coarseSec = segmentLease.coarseSec;
      } else if (fs.statSync(tempPrerollMkv).size >= MAX_SEGMENT_BYTES) {
        throw new Error(
          "The target segment hit the local read limit (" +
            MAX_SEGMENT_BYTES / 1024 / 1024 +
            " MiB). Try a different capture point.",
        );
      }
    }

    // Publication is complete; waiting captures may reuse the fragment during extraction.
    await preparationLease?.release();

    // 2. Inspect exact video resolution, HDR color metadata, and subtitle tracks
    onStage?.(
      usedPrerollCopy
        ? "Reading frame and subtitle info from the local temp video…"
        : "Reading frame and subtitle info from the original video (temp segment failed)…",
    );
    const inspected = await inspectContainerMetadata(
      config.ffprobePath,
      workingMediaPath,
      config.bypassProxy,
      budget.probeTimeoutMs,
    );
    const subtitles = mergeSubtitleStreams(inspected.subtitles, probe.subtitles);
    const { colorInfo } = inspected;

    // 3. Prepare collision-free output filenames
    const cleanTitle = sanitizeMovieTitle(probe.movieName);
    const timeTag = formatFileTimeTag(probe.positionSec);
    const baseName = getUniqueBaseName(config.saveDirectory, `${cleanTitle}_${timeTag}_${task.id.slice(0, 8)}`);

    const cleanPngPath = path.join(config.saveDirectory, `${baseName}_clean.png`);
    const subbedPngPath = path.join(config.saveDirectory, `${baseName}_subbed.png`);
    const layeredSvgPath = path.join(config.saveDirectory, `${baseName}_layered.svg`);

    // 4. Measure decoded PTS around the target, then extract the frame on screen (last PTS <= target).
    // Cached fragments already carry a source-clock target; local files need their start offset.
    const frameSelection = await selectDisplayedFrame({
      ffprobePath: config.ffprobePath,
      mediaPath: workingMediaPath,
      requestedTitleSec: probe.positionSec,
      sourceTargetPTS: usedPrerollCopy ? targetSec : undefined,
      env,
      timeoutMs: budget.frameDecodeTimeoutMs,
    });
    onStage?.(`Decoding frame-accurate 16-bit ${colorInfo.isHdr ? "HDR " : ""}master frame...`);
    const cleanInputArgs = usedPrerollCopy
      ? ["-copyts", "-i", workingMediaPath]
      : [
          ...remoteInputFlags(probe.isRemote),
          "-ss",
          formatFfmpegTimestamp(coarseSec),
          "-copyts",
          "-i",
          workingMediaPath,
        ];

    const cleanResult = await execFileAsync(
      config.ffmpegPath,
      [
        "-hide_banner",
        "-loglevel",
        "info",
        "-y",
        ...cleanInputArgs,
        "-map",
        "0:v:0",
        "-an",
        "-sn",
        "-vf",
        `select=eq(pts\\,${frameSelection.selectedPtsTicks}),showinfo`,
        "-frames:v",
        "1",
        "-fps_mode",
        "passthrough",
        "-pix_fmt",
        "rgb48be",
        cleanPngPath,
      ],
      { env, timeout: budget.frameDecodeTimeoutMs },
    );
    try {
      frameSelection.decodedPTS = verifyDecodedFrame(cleanResult.stderr, frameSelection);
    } catch (error) {
      fs.rmSync(cleanPngPath, { force: true });
      throw error;
    }
    fs.writeFileSync(
      path.join(projectDir, "frame-selection.json"),
      JSON.stringify(
        {
          ...frameSelection,
          playbackObservation: probe.playbackObservation ?? null,
          sourceToTitleOffsetSec: frameSelection.sourceTargetPTS - probe.positionSec,
          usedPrerollCopy,
        },
        null,
        2,
      ),
    );

    // A byte-size threshold misread legitimately dark frames as failures: a 720p
    // pure-black 16-bit PNG is only ~7 KB. Validate the decoded image instead —
    // the header must be a real PNG at the expected capture resolution.
    const cleanPng = fs.existsSync(cleanPngPath) ? pngSize(cleanPngPath) : undefined;
    if (!cleanPng || cleanPng.width !== colorInfo.width || cleanPng.height !== colorInfo.height) {
      fs.rmSync(cleanPngPath, { force: true });
      throw new Error(
        "The temp video doesn't cover the target frame, so no capture was made. Pause playback and try again. If it keeps happening, check that the player's reported position matches the actual video time.",
      );
    }

    // Match subtitle state to the actual displayed video frame, not a rounded request.
    targetSec = frameSelection.selectedPTS;

    // 5. Publish the clean frame now and defer all subtitle work.
    // Extracting every track (PGS dumps, text conversion, alpha probing) costs far
    // more than decoding the frame, and holding the capture slot for it blocked
    // every later screenshot behind one slow film. The clean PNG is already
    // validated and on disk, so hand subtitles to a separate compose task.
    const manifest: CaptureProjectManifest = {
      id: task.id,
      createdAt: new Date().toISOString(),
      movieName: probe.movieName,
      timestampSec: probe.positionSec,
      timestampFormatted: formatHmsDisplay(probe.positionSec),
      source: probe.source,
      colorInfo,
      cinemaBar: flags.cinemaBar,
      alignTop: flags.alignTop,
      projectDir,
      cleanPngPath,
      subbedPngPath,
      layeredSvgPath,
      layers: [],
      composeState: subtitles.length > 0 ? "pending" : "done",
    };
    if (subtitles.length > 0) {
      const composeSource = await stageComposeSource(workingMediaPath, projectDir, probe);
      fs.writeFileSync(
        path.join(projectDir, "compose-context.json"),
        JSON.stringify({ mediaPath: composeSource, targetSec, coarseSec, usedPrerollCopy, subtitles }, null, 2),
      );
    }
    fs.writeFileSync(path.join(projectDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    return {
      id: task.id,
      type: "screenshot",
      movieName: probe.movieName,
      timestampLabel: formatHmsDisplay(probe.positionSec),
      createdAt: new Date().toISOString(),
      source: probe.source,
      isHdr: colorInfo.isHdr,
      cleanPngPath,
      manifestPath: path.join(projectDir, "manifest.json"),
      composeState: manifest.composeState,
    };
  } catch (error) {
    if (rangeSource?.error()) throw new Error(rangeSource.error());
    throw error;
  } finally {
    if (progressTimer) clearInterval(progressTimer);
    await preparationLease?.release();
    fs.writeFileSync(path.join(projectDir, "cache-stats.json"), JSON.stringify(cacheStats));
    await segmentLease?.release();
    if (rangeSource) {
      fs.writeFileSync(path.join(projectDir, "read-stats.json"), JSON.stringify(rangeSource.stats));
      await rangeSource.close();
    }
    if (tempPrerollMkv && fs.existsSync(tempPrerollMkv)) {
      fs.rmSync(tempPrerollMkv, { force: true });
    }
  }
}

interface ComposeContext {
  mediaPath: string;
  targetSec: number;
  coarseSec: number;
  usedPrerollCopy: boolean;
  subtitles: SubtitleStreamMeta[];
}

/** Keep a private handle on the prepared fragment for the compose stage.
 * A hardlink adds no bytes on the same filesystem, and a download already paid
 * for must not be repeated just to read subtitle tracks.
 */
async function stageComposeSource(
  workingMediaPath: string,
  projectDir: string,
  probe: PlaybackProbeResult,
): Promise<string> {
  if (!probe.isRemote && workingMediaPath === probe.mediaTarget) return workingMediaPath;
  const target = path.join(projectDir, `_compose-source${path.extname(workingMediaPath) || ".mkv"}`);
  try {
    await fs.promises.rm(target, { force: true });
    await fs.promises.link(workingMediaPath, target);
    return target;
  } catch {
    try {
      await fs.promises.copyFile(workingMediaPath, target);
      return target;
    } catch {
      return workingMediaPath;
    }
  }
}

/** Second stage: extract every subtitle track and rebuild _subbed.png/_layered.svg.
 * Runs in its own queue slot so a slow title never delays the next capture. A
 * failure here must not invalidate the clean frame that is already delivered.
 */
export async function executeComposeTask(
  task: ComposeQueueTask,
  onStage?: (stage: string) => void,
): Promise<HistoryEntry> {
  const { config, probe } = task;
  const env = buildExecutionEnv(config.bypassProxy);
  const budget = computeMediaBudget(probe);
  const projectDir = path.join(statePaths(config.supportPath).projectsDir, task.parentId);
  const manifestPath = path.join(projectDir, "manifest.json");
  const contextPath = path.join(projectDir, "compose-context.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as CaptureProjectManifest;
  const context = JSON.parse(fs.readFileSync(contextPath, "utf8")) as ComposeContext;
  const { colorInfo } = manifest;
  const { mediaPath, coarseSec, usedPrerollCopy } = context;
  const targetSec = context.targetSec;
  const sourceInputArgs = usedPrerollCopy
    ? ["-copyts", "-i", mediaPath]
    : [...remoteInputFlags(probe.isRemote), "-ss", formatFfmpegTimestamp(coarseSec), "-copyts", "-i", mediaPath];

  const layers: ExtractedLayer[] = [];
  const subtitleErrors: number[] = [];
  if (!fs.existsSync(mediaPath))
    throw new Error("The temporary video for this capture is gone, so subtitles can't be rebuilt. Capture again.");
  try {
    for (const sub of context.subtitles) {
      onStage?.(`Reading subtitle track [${sub.index}] ${sub.title}…`);
      const layerId = `Subtitle-Track-${sub.index}-${sub.language}`;

      if (sub.isBitmap) {
        const bitmapFilename = `track_${sub.index}_${sub.language}.png`;
        const bitmapFullPath = path.join(projectDir, bitmapFilename);
        try {
          let canvas = { width: colorInfo.width, height: colorInfo.height };
          let bitmapInputArgs = sourceInputArgs;
          let bitmapOrdinal = sub.subOrdinal;
          if (sub.codec === "hdmv_pgs_subtitle" || sub.codec === "pgssub") {
            const supPath = path.join(projectDir, `track_${sub.index}.sup`);
            try {
              await execFileAsync(
                config.ffmpegPath,
                [
                  "-v",
                  "error",
                  "-y",
                  ...sourceInputArgs,
                  "-map",
                  `0:s:${sub.subOrdinal}`,
                  "-c:s",
                  "copy",
                  "-f",
                  "sup",
                  supPath,
                ],
                { env, timeout: budget.subtitleExtractTimeoutMs },
              );
              // A track with no packets in this window dumps an empty .sup. Feeding
              // that to the overlay filter never returns: the PGS decoder waits for
              // a packet that will not arrive.
              const supBytes = fs.existsSync(supPath) ? fs.statSync(supPath).size : 0;
              if (supBytes === 0) {
                layers.push({
                  id: layerId,
                  index: sub.index,
                  subOrdinal: sub.subOrdinal,
                  language: sub.language,
                  title: sub.title,
                  codec: sub.codec,
                  kind: "bitmap",
                  visible: false,
                  yOffset: 0,
                  isChinese: sub.isChinese,
                  isEnglish: sub.isEnglish,
                  hasActiveContent: false,
                  isEmptyTrack: true,
                });
                continue;
              }
              canvas = readPgsCanvas(supPath) || canvas;
              bitmapInputArgs = ["-copyts", "-i", supPath];
              bitmapOrdinal = 0;
            } catch (error) {
              fs.rmSync(supPath, { force: true });
              throw error;
            }
          }
          await execFileAsync(
            config.ffmpegPath,
            [
              "-hide_banner",
              "-loglevel",
              "error",
              "-y",
              ...bitmapInputArgs,
              "-f",
              "lavfi",
              "-i",
              `color=c=black@0.0:s=${canvas.width}x${canvas.height}:r=24:d=${(targetSec - coarseSec + 1).toFixed(3)},format=rgba`,
              "-filter_complex",
              `[1:v]setpts=PTS+${coarseSec.toFixed(3)}/TB[bg];[bg][0:s:${bitmapOrdinal}]overlay=eof_action=pass:shortest=0:format=auto,select=gte(t\\,${targetSec.toFixed(6)}),scale=${colorInfo.width}:${colorInfo.height}[out]`,
              "-map",
              "[out]",
              "-frames:v",
              "1",
              "-fps_mode",
              "passthrough",
              bitmapFullPath,
            ],
            { env, timeout: budget.subtitleExtractTimeoutMs },
          );

          if (fs.existsSync(bitmapFullPath)) {
            const stat = fs.statSync(bitmapFullPath);
            const hasActive = await hasVisibleAlphaPixels(config.ffmpegPath, bitmapFullPath, env);
            layers.push({
              id: layerId,
              index: sub.index,
              subOrdinal: sub.subOrdinal,
              language: sub.language,
              title: sub.title,
              codec: sub.codec,
              kind: "bitmap",
              visible: false,
              yOffset: 0,
              isChinese: sub.isChinese,
              isEnglish: sub.isEnglish,
              bitmapFilename,
              bitmapBytes: stat.size,
              hasActiveContent: hasActive,
            });
          }
        } catch {
          subtitleErrors.push(sub.index);
        } finally {
          fs.rmSync(path.join(projectDir, `track_${sub.index}.sup`), { force: true });
        }
      } else {
        // Text track (SRT / ASS / VTT / mov_text): extract the window, then match the cue.
        const textWinStart = Math.max(0, targetSec - 25.0);
        const textInputArgs = usedPrerollCopy
          ? ["-copyts", "-i", mediaPath]
          : [
              ...remoteInputFlags(probe.isRemote),
              "-ss",
              formatFfmpegTimestamp(textWinStart),
              "-copyts",
              "-i",
              mediaPath,
              "-to",
              formatFfmpegTimestamp(targetSec + 3.0),
            ];
        try {
          const { stdout } = await execFileAsync(
            config.ffmpegPath,
            ["-hide_banner", "-loglevel", "error", ...textInputArgs, "-map", `0:s:${sub.subOrdinal}`, "-f", "srt", "-"],
            { env, timeout: budget.subtitleExtractTimeoutMs, maxBuffer: 4 * 1024 * 1024 },
          );
          const matchedText = findActiveSubtitleText(stdout, targetSec);
          layers.push({
            id: layerId,
            index: sub.index,
            subOrdinal: sub.subOrdinal,
            language: sub.language,
            title: sub.title,
            codec: sub.codec,
            kind: "text",
            visible: false,
            yOffset: 0,
            isChinese: sub.isChinese,
            isEnglish: sub.isEnglish,
            hasActiveContent: matchedText.length > 0,
            isEmptyTrack: stdout.trim().length === 0,
            text: matchedText,
            fontFamily: "PingFang SC",
            fontSize: Math.max(28, Math.round(colorInfo.height * 0.044)),
            fillColor: "#FFFFFF",
            strokeColor: "#000000",
          });
        } catch {
          subtitleErrors.push(sub.index);
        }
      }
    }

    fs.writeFileSync(
      path.join(projectDir, "subtitle-status.json"),
      JSON.stringify({
        failedTracks: subtitleErrors,
        activeTracks: layers.filter((l) => l.hasActiveContent).map((l) => l.index),
        sourceTargetSec: targetSec,
      }),
    );

    // One unreadable track must not discard the tracks that did work; the clean
    // frame is already delivered, so report the gap instead of failing silently.
    manifest.layers = layers;
    applyInitialLayerSelection(layers, task.flags.mode, colorInfo.height);
    const hasSubtitles = layers.some((layer) => layer.hasActiveContent);
    onStage?.(hasSubtitles ? "Compositing subtitled frame and layered SVG…" : "Preparing subtitle layers…");
    if (hasSubtitles) {
      await recomposeCaptureOutputs(manifest, config.supportPath, config.ffmpegPath, config.bypassProxy);
    } else {
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }

    manifest.composeState = "done";
    if (subtitleErrors.length) {
      manifest.composeError = `Couldn't read subtitle track(s) ${subtitleErrors.join(", ")}; composited with the remaining tracks.`;
    } else {
      delete manifest.composeError;
    }
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    fs.rmSync(contextPath, { force: true });
    // Only a finished compose releases its staged source; a failed one keeps it for Retry.
    if (mediaPath.startsWith(projectDir) && path.basename(mediaPath).startsWith("_compose-source")) {
      fs.rmSync(mediaPath, { force: true });
    }

    return {
      id: task.parentId,
      type: "screenshot",
      movieName: probe.movieName,
      timestampLabel: formatHmsDisplay(probe.positionSec),
      createdAt: new Date().toISOString(),
      source: probe.source,
      cleanPngPath: manifest.cleanPngPath,
      subbedPngPath: hasSubtitles ? manifest.subbedPngPath : undefined,
      layeredSvgPath: hasSubtitles ? manifest.layeredSvgPath : undefined,
      manifestPath,
      trackCount: layers.length,
      composeState: "done",
      composeError: manifest.composeError,
    };
  } catch (error) {
    if (!fs.existsSync(mediaPath))
      throw new Error("The temporary video for this capture is gone, so subtitles can't be rebuilt. Capture again.");
    throw error;
  }
}

export async function executeClipTask(task: ClipQueueTask, onStage?: (stage: string) => void): Promise<HistoryEntry> {
  const { config, probe, startSec, durationSec } = task;
  assertReadableVideoSource(probe);
  const env = buildExecutionEnv(config.bypassProxy);
  // Stream copy throughput scales with source bitrate and distance to the server,
  // so a fixed 600s deadline silently killed long takes on big masters. Allow
  // at least a minute of overhead plus roughly 20x realtime for the clip span.
  const clipTimeoutMs = Math.max(600_000, Math.round(durationSec * 20_000) + 120_000);

  const cleanTitle = sanitizeMovieTitle(probe.movieName);
  const timeTag = `${formatFileTimeTag(startSec)}_${Math.round(durationSec)}s`;
  const baseName = getUniqueBaseName(config.saveDirectory, `${cleanTitle}_${timeTag}_${task.id.slice(0, 8)}`);
  const outMkvPath = path.join(config.saveDirectory, `${baseName}.mkv`);

  let subtitles = probe.subtitles;
  if (subtitles.length === 0) {
    try {
      const inspected = await inspectContainerMetadata(config.ffprobePath, probe.mediaTarget, config.bypassProxy);
      subtitles = mergeSubtitleStreams(inspected.subtitles, probe.subtitles);
    } catch {
      // Proceed with available stream info
    }
  }

  const bestChi = subtitles.find((s) => s.isChinese) ?? subtitles[0];

  {
    // Lossless multi-audio + multi-subtitle stream copy (0% quality loss, keeps TrueHD Atmos / DTS-HD MA)
    onStage?.("Stream-copying lossless multi-track MKV clip...");
    const dispArgs: string[] = ["-disposition:s", "0"];
    if (bestChi) {
      dispArgs.push(`-disposition:s:${bestChi.subOrdinal}`, "default");
    }

    // MOV/MP4 stores subtitles as mov_text, which Matroska cannot accept with
    // -c:s copy. Choosing the target codec up front avoids streaming the whole
    // clip twice: the first pass used to fail on the Matroska header, then the
    // fallback re-read every byte from the server, which on a long ProRes film
    // is what pushed the command into its 600s deadline.
    const needsSubtitleConversion = subtitles.some((s) => s.codec === "mov_text");
    const subtitleCodec = needsSubtitleConversion ? "srt" : "copy";

    const copyArgs = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      ...remoteInputFlags(probe.isRemote),
      "-probesize",
      "15M",
      "-analyzeduration",
      "15M",
      "-ss",
      formatFfmpegTimestamp(startSec),
      "-i",
      probe.mediaTarget,
      "-t",
      durationSec.toFixed(3),
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-map",
      "0:s?",
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "-c:s",
      subtitleCodec,
      "-avoid_negative_ts",
      "make_zero",
      ...dispArgs,
      outMkvPath,
    ];

    try {
      await execFileAsync(config.ffmpegPath, copyArgs, { env, timeout: clipTimeoutMs });
    } catch (error) {
      if (subtitleCodec === "srt") throw error;
      // Other packs may still refuse the copied subtitle codec; retry once as text.
      const fallbackArgs = copyArgs.map((arg, idx) => (arg === "copy" && copyArgs[idx - 1] === "-c:s" ? "srt" : arg));
      await execFileAsync(config.ffmpegPath, fallbackArgs, { env, timeout: clipTimeoutMs });
    }
  }

  // A fixed byte threshold rejected legitimate short clips: one second of a
  // static 720p source stream-copies to ~7 KB. Confirm the container actually
  // carries a video stream instead of guessing from size.
  if (!fs.existsSync(outMkvPath)) {
    throw new Error("Clip output was not created.");
  }
  const stat = fs.statSync(outMkvPath);
  if (stat.size === 0) {
    fs.rmSync(outMkvPath, { force: true });
    throw new Error("Clip output is empty; the source did not yield any decodable stream.");
  }
  try {
    const probe = await execFileAsync(
      config.ffprobePath,
      ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_type", "-of", "csv=p=0", outMkvPath],
      { env, timeout: 30_000, maxBuffer: 1024 * 1024 },
    );
    if (probe.stdout.trim() !== "video") throw new Error("no video stream");
  } catch {
    fs.rmSync(outMkvPath, { force: true });
    throw new Error(`Clip output (${stat.size} bytes) has no playable video stream and was discarded.`);
  }

  return {
    id: task.id,
    type: "clip",
    movieName: probe.movieName,
    timestampLabel: `${formatHmsDisplay(startSec)} (+${durationSec.toFixed(1)}s)`,
    createdAt: new Date().toISOString(),
    source: probe.source,
    clipMkvPath: outMkvPath,
    sizeMb: Math.round((stat.size / (1024 * 1024)) * 10) / 10,
    trackCount: subtitles.length,
  };
}
