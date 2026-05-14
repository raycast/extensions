import { showHUD } from "@raycast/api";
import { AudioPlayer, clearExternalStopRequest, hasExternalStopRequest } from "./audio-player";
import { formatTextSource } from "./text-source";
import { ReadingSession, saveReadingSession, updateReadingProgress } from "./reading-session";
import { buildTextPreview, clearPlaybackState, writePlaybackState } from "./playback-state";
import { clampSpeed, clearPlaybackSpeed, formatSpeed, readPlaybackSpeed, writePlaybackSpeed } from "./playback-speed";
import { startMiniMaxSynthesisJob, synthesizeMiniMaxChunk, type MiniMaxSynthesisJob } from "./minimax-synthesis";

interface LookaheadJob {
  index: number;
  speed: number;
  job: MiniMaxSynthesisJob;
}

export interface ReadingRunnerCallbacks {
  onChunkPhase?: (progress: {
    phase: "synthesizing" | "playing";
    chunkIndex: number;
    chunkTotal: number;
    speed: number;
  }) => Promise<void> | void;
}

export async function playReadingSession(
  session: ReadingSession,
  isResuming = false,
  callbacks: ReadingRunnerCallbacks = {},
): Promise<void> {
  const player = new AudioPlayer();
  let activeSession = session;
  const chunkCount = session.chunks.length;
  const startIndex = Math.min(session.nextChunkIndex, chunkCount);
  const sourceLabel = formatTextSource(session.source);
  const textPreview = buildTextPreview(session.text);
  const previewSuffix = textPreview ? ` "${textPreview}"` : "";

  if (chunkCount === 0) {
    await showHUD("No text to read");
    return;
  }

  // Seed the live speed value from the session so menubar / Speed Up / Slow
  // Down can read it back. A previously adjusted session keeps its speed.
  let currentSpeed = clampSpeed(activeSession.options.speed);
  let lookahead: LookaheadJob | null = null;
  await writePlaybackSpeed(currentSpeed);

  try {
    const speedSuffix = currentSpeed === 1 ? "" : ` · ${formatSpeed(currentSpeed)}`;
    await showHUD(
      `${isResuming ? "Resuming" : "Reading"}${previewSuffix} · ${session.text.length} chars from ${sourceLabel} (${
        startIndex + 1
      }/${chunkCount})${speedSuffix}`,
    );

    for (let i = startIndex; i < chunkCount; i++) {
      if (player.isStopped() || hasExternalStopRequest()) break;

      // Pick up any speed change made by Speed Up / Slow Down between chunks.
      const desiredSpeed = (await readPlaybackSpeed()) ?? currentSpeed;
      const speedChanged = desiredSpeed !== currentSpeed;
      currentSpeed = desiredSpeed;

      const chunkOptions = { ...activeSession.options, speed: currentSpeed };
      const audioPromise =
        lookahead?.index === i && lookahead.speed === currentSpeed
          ? lookahead.job.promise
          : synthesizeMiniMaxChunk(activeSession.chunks[i], chunkOptions, player);

      if (lookahead && (lookahead.index !== i || lookahead.speed !== currentSpeed)) {
        lookahead.job.cancel();
      }
      lookahead = null;

      await writePlaybackState({
        phase: "synthesizing",
        voiceId: activeSession.options.voiceId,
        source: activeSession.source,
        textPreview,
        totalChars: activeSession.text.length,
        chunkIndex: i,
        chunkTotal: chunkCount,
        speed: currentSpeed,
        updatedAt: new Date().toISOString(),
      });
      await callbacks.onChunkPhase?.({
        phase: "synthesizing",
        chunkIndex: i,
        chunkTotal: chunkCount,
        speed: currentSpeed,
      });

      const audio = await audioPromise;
      if (!audio) break;
      if (player.isStopped() || hasExternalStopRequest()) break;

      if (i + 1 < chunkCount) {
        lookahead = {
          index: i + 1,
          speed: currentSpeed,
          job: startMiniMaxSynthesisJob(
            activeSession.chunks[i + 1],
            { ...activeSession.options, speed: currentSpeed },
            player,
          ),
        };
        // Prevent an unhandled rejection if the next synthesis fails before
        // the loop reaches that chunk; the original promise is still awaited.
        lookahead.job.promise.catch(() => undefined);
      }

      await writePlaybackState({
        phase: "playing",
        voiceId: activeSession.options.voiceId,
        source: activeSession.source,
        textPreview,
        totalChars: activeSession.text.length,
        chunkIndex: i,
        chunkTotal: chunkCount,
        speed: currentSpeed,
        updatedAt: new Date().toISOString(),
      });
      await callbacks.onChunkPhase?.({
        phase: "playing",
        chunkIndex: i,
        chunkTotal: chunkCount,
        speed: currentSpeed,
      });

      await player.playAudio(audio);

      if (speedChanged) {
        // Persist the latest speed to the session so Resume Last Reading
        // continues at the user's chosen pace.
        activeSession = {
          ...activeSession,
          options: { ...activeSession.options, speed: currentSpeed },
        };
        await saveReadingSession(activeSession);
      }

      if (player.isStopped() || hasExternalStopRequest()) {
        break;
      }

      activeSession = await updateReadingProgress(activeSession, i + 1);

      if (hasExternalStopRequest()) {
        break;
      }
    }

    if (activeSession.nextChunkIndex >= chunkCount && !player.isStopped() && !hasExternalStopRequest()) {
      await showHUD("Playback complete");
      await clearPlaybackState();
      await clearPlaybackSpeed();
    } else if (hasExternalStopRequest()) {
      const nextChunk = Math.min(activeSession.nextChunkIndex + 1, chunkCount);
      await showHUD(`Stopped${previewSuffix} · paused at ${nextChunk}/${chunkCount}`);
      await writePlaybackState({
        phase: "stopped",
        voiceId: activeSession.options.voiceId,
        source: activeSession.source,
        textPreview,
        totalChars: activeSession.text.length,
        chunkIndex: Math.min(activeSession.nextChunkIndex, chunkCount - 1),
        chunkTotal: chunkCount,
        speed: currentSpeed,
        updatedAt: new Date().toISOString(),
      });
      // Intentionally keep the live speed value so Resume Last Reading
      // picks up the user's adjusted pace.
      clearExternalStopRequest();
    } else if (player.isStopped()) {
      await clearPlaybackState();
      // Same rationale: do not clear playback speed on a manual stop.
    }
  } finally {
    lookahead?.job.cancel();
    player.cleanup();
  }
}
