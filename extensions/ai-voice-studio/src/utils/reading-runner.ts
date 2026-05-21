import { showHUD } from "@raycast/api";
import { AudioPlayer, clearExternalStopRequest, hasExternalStopRequest } from "./audio-player";
import { formatTextSource } from "./text-source";
import { ReadingSession, saveReadingSession, updateReadingProgress } from "./reading-session";
import { buildTextPreview, clearPlaybackState, writePlaybackState } from "./playback-state";
import { clampSpeed, clearPlaybackSpeed, formatSpeed, readPlaybackSpeed, writePlaybackSpeed } from "./playback-speed";
import { startMiniMaxSynthesisJob } from "./minimax-synthesis";
import { playChunkSequence } from "./chunk-playback-engine";

export interface ReadingRunnerCallbacks {
  onChunkPhase?: (progress: {
    phase: "synthesizing" | "playing";
    chunkIndex: number;
    chunkTotal: number;
    speed: number;
  }) => Promise<void> | void;
  // When the caller presents its own progress UI (e.g. an animated toast with
  // a Stop action), set this to skip the runner's own HUD so the two surfaces
  // don't compete. Defaults to false — existing callers are unaffected.
  suppressHud?: boolean;
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
  let speedChangedThisChunk = false;
  await writePlaybackSpeed(currentSpeed);

  try {
    const speedSuffix = currentSpeed === 1 ? "" : ` · ${formatSpeed(currentSpeed)}`;
    if (!callbacks.suppressHud) {
      await showHUD(
        `${isResuming ? "Resuming" : "Reading"}${previewSuffix} · ${session.text.length} chars from ${sourceLabel} (${
          startIndex + 1
        }/${chunkCount})${speedSuffix}`,
      );
    }

    await playChunkSequence<ReadingSession["options"]>({
      total: chunkCount,
      startIndex,
      player,
      shouldStop: () => player.isStopped() || hasExternalStopRequest(),
      stopCheckAtLoopTop: true,
      stopCheckBeforeOutcome: false,
      stopCheckAfterAdvance: true,
      stopAfterAdvance: () => hasExternalStopRequest(),
      resolveOptions: async () => {
        // Pick up any speed change made by Speed Up / Slow Down between chunks.
        const desiredSpeed = (await readPlaybackSpeed()) ?? currentSpeed;
        speedChangedThisChunk = desiredSpeed !== currentSpeed;
        currentSpeed = desiredSpeed;
        return { ...activeSession.options, speed: currentSpeed };
      },
      optionsKey: (options) => String(options.speed),
      startJob: (index, options) => {
        const job = startMiniMaxSynthesisJob(activeSession.chunks[index], options, player);
        return {
          outcome: job.promise.then(
            (audio) => (audio == null ? ({ kind: "stopped" } as const) : ({ kind: "audio", audio } as const)),
            (cause) => ({ kind: "error", cause }) as const,
          ),
          cancel: job.cancel,
        };
      },
      errorIsStop: () => false,
      onError: (_index, _total, cause) => {
        throw cause;
      },
      onPhase: async (phase, index) => {
        await writePlaybackState({
          phase,
          voiceId: activeSession.options.voiceId,
          source: activeSession.source,
          textPreview,
          totalChars: activeSession.text.length,
          chunkIndex: index,
          chunkTotal: chunkCount,
          speed: currentSpeed,
          updatedAt: new Date().toISOString(),
        });
        await callbacks.onChunkPhase?.({ phase, chunkIndex: index, chunkTotal: chunkCount, speed: currentSpeed });
      },
      play: (audio) => player.playAudio(audio),
      afterPlay: async () => {
        if (speedChangedThisChunk) {
          // Persist the latest speed to the session so Resume Last Reading
          // continues at the user's chosen pace.
          activeSession = {
            ...activeSession,
            options: { ...activeSession.options, speed: currentSpeed },
          };
          await saveReadingSession(activeSession);
        }
      },
      afterAdvance: async (index) => {
        activeSession = await updateReadingProgress(activeSession, index + 1);
      },
    });

    if (activeSession.nextChunkIndex >= chunkCount && !player.isStopped() && !hasExternalStopRequest()) {
      if (!callbacks.suppressHud) await showHUD("Playback complete");
      await clearPlaybackState();
      await clearPlaybackSpeed();
    } else if (hasExternalStopRequest()) {
      const nextChunk = Math.min(activeSession.nextChunkIndex + 1, chunkCount);
      if (!callbacks.suppressHud) await showHUD(`Stopped${previewSuffix} · paused at ${nextChunk}/${chunkCount}`);
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
    player.cleanup();
  }
}
