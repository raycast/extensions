import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { isSynthesisCancelled, synthesizeSpeech } from "../api/gemini-tts";
import type { SynthesisResult, TTSOptions } from "../api/types";
import { AudioPlayer, clearExternalStopRequest, hasExternalStopRequest } from "./audio-player";
import { formatTextSource } from "./text-source";
import { ReadingSession, saveReadingSession, updateReadingProgress } from "./reading-session";
import {
  buildTextPreview,
  clearPlaybackState,
  PlaybackPhase,
  PlaybackState,
  writePlaybackState,
} from "./playback-state";
import { clampSpeed, clearPlaybackSpeed, formatSpeed, readPlaybackSpeed, writePlaybackSpeed } from "./playback-speed";
import { acquireSessionLock, releaseSessionLock } from "./session-lock";

const PREFETCH_AHEAD = 3;

export async function playReadingSession(session: ReadingSession, isResuming = false): Promise<void> {
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

  if (!acquireSessionLock()) {
    await showHUD("Another reading is already in progress");
    return;
  }

  // Hoist long-lived resources so the finally block can always tear them
  // down even if writePlaybackSpeed or the seed prefetch loop throws.
  // Without the hoist, an early throw would leak the session lock and
  // the next reading would fail with "Another reading is already in
  // progress" until Raycast restarts.
  let currentSpeed = clampSpeed(activeSession.options.speed);
  const synthesisController = new AbortController();
  const prefetchBuffer: Map<number, Promise<SynthesisResult>> = new Map();
  let stopPoll: NodeJS.Timeout | null = null;

  function firePrefetch(idx: number): void {
    if (idx >= chunkCount || prefetchBuffer.has(idx)) return;
    const p = startSynth(activeSession.options, activeSession.chunks[idx], synthesisController.signal);
    p.catch(() => undefined);
    prefetchBuffer.set(idx, p);
  }

  try {
    await writePlaybackSpeed(currentSpeed);
    stopPoll = setInterval(() => {
      if ((player.isStopped() || hasExternalStopRequest()) && !synthesisController.signal.aborted) {
        synthesisController.abort();
      }
    }, 100);

    // Seed the prefetch buffer: lead chunk + next PREFETCH_AHEAD-1.
    for (let k = startIndex; k < Math.min(startIndex + PREFETCH_AHEAD, chunkCount); k++) {
      firePrefetch(k);
    }

    let lastPhase: PlaybackPhase | null = null;

    const speedSuffix = currentSpeed === 1 ? "" : ` · ${formatSpeed(currentSpeed)}`;
    await showHUD(
      `${isResuming ? "Resuming" : "Reading"}${previewSuffix} · ${session.text.length} chars from ${sourceLabel} (${
        startIndex + 1
      }/${chunkCount})${speedSuffix}`,
    );

    for (let i = startIndex; i < chunkCount; i++) {
      if (player.isStopped() || hasExternalStopRequest()) break;

      const desiredSpeed = (await readPlaybackSpeed()) ?? currentSpeed;
      const speedChanged = desiredSpeed !== currentSpeed;
      currentSpeed = desiredSpeed;

      await writeStateAndMaybeRefresh(
        {
          phase: "synthesizing",
          voiceId: activeSession.options.voiceId,
          source: activeSession.source,
          textPreview,
          totalChars: activeSession.text.length,
          chunkIndex: i,
          chunkTotal: chunkCount,
          speed: currentSpeed,
          updatedAt: new Date().toISOString(),
        },
        lastPhase,
      );
      lastPhase = "synthesizing";

      let audio: SynthesisResult;
      try {
        audio = await (prefetchBuffer.get(i) ??
          startSynth(activeSession.options, activeSession.chunks[i], synthesisController.signal));
      } catch (error) {
        if (isSynthesisCancelled(error) && (player.isStopped() || hasExternalStopRequest())) {
          break;
        }
        throw error;
      } finally {
        prefetchBuffer.delete(i);
      }

      if (player.isStopped() || hasExternalStopRequest()) break;

      // Refill prefetch buffer: keep PREFETCH_AHEAD chunks in flight ahead
      // of current playback position.
      for (let k = i + 1; k <= Math.min(i + PREFETCH_AHEAD, chunkCount - 1); k++) {
        firePrefetch(k);
      }

      await writeStateAndMaybeRefresh(
        {
          phase: "playing",
          voiceId: activeSession.options.voiceId,
          source: activeSession.source,
          textPreview,
          totalChars: activeSession.text.length,
          chunkIndex: i,
          chunkTotal: chunkCount,
          speed: currentSpeed,
          updatedAt: new Date().toISOString(),
        },
        lastPhase,
      );
      lastPhase = "playing";

      await player.playAudio(audio, currentSpeed);

      if (speedChanged) {
        activeSession = {
          ...activeSession,
          options: { ...activeSession.options, speed: currentSpeed },
        };
        await saveReadingSession(activeSession);
      }
      activeSession = await updateReadingProgress(activeSession, i + 1);

      if (hasExternalStopRequest()) break;
    }

    if (activeSession.nextChunkIndex >= chunkCount && !player.isStopped() && !hasExternalStopRequest()) {
      await showHUD("Playback complete");
      await clearPlaybackState();
      await clearPlaybackSpeed();
      requestMenuRefresh();
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
      requestMenuRefresh();
    } else if (player.isStopped()) {
      await clearPlaybackState();
      requestMenuRefresh();
    }
  } finally {
    synthesisController.abort();
    if (stopPoll) clearInterval(stopPoll);
    for (const p of prefetchBuffer.values()) {
      p.catch(() => undefined);
    }
    prefetchBuffer.clear();
    player.cleanup();
    releaseSessionLock();
    // Always clear STOP_FILE on the way out. Without this, an externally
    // triggered stop leaves STOP_FILE on disk; the next session that
    // forgets to clear it would immediately see hasExternalStopRequest()
    // true on its first iteration and exit without reading anything.
    clearExternalStopRequest();
  }
}

function startSynth(sessionOptions: TTSOptions, chunkText: string, signal: AbortSignal): Promise<SynthesisResult> {
  // Speed is intentionally not part of the synthesis cache key (afplay
  // applies it at playback). Pass the raw options unchanged so we hit
  // the cache regardless of current speed.
  return synthesizeSpeech(chunkText, sessionOptions, signal);
}

async function writeStateAndMaybeRefresh(state: PlaybackState, lastPhase: PlaybackPhase | null): Promise<void> {
  await writePlaybackState(state);
  // Only nudge the menu bar on actual phase transitions. A long
  // reading otherwise launches the menu-bar command N times for no
  // visible change. The phase set is tiny (synthesizing/playing/
  // stopped/completed) so this caps refreshes at ~2 per chunk.
  if (lastPhase !== state.phase) {
    requestMenuRefresh();
  }
}

function requestMenuRefresh(): void {
  // Background-launch the menu-bar command so it re-reads playback state
  // immediately instead of waiting for its 1-minute interval. Fire-and-
  // forget; failures are non-fatal (the menu bar will catch up on its
  // next interval tick anyway).
  launchCommand({ name: "playback-status", type: LaunchType.Background }).catch(() => undefined);
}
