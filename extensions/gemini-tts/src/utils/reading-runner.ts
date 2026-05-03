import { LaunchType, launchCommand, showHUD } from "@raycast/api";
import { synthesizeSpeech } from "../api/gemini-tts";
import type { SynthesisResult, TTSOptions } from "../api/types";
import { AudioPlayer, hasExternalStopRequest } from "./audio-player";
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

const MENU_REFRESH_MIN_INTERVAL_MS = 750;

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

  // Seed the live speed value from the session so menubar / Speed Up / Slow
  // Down can read it back. A previously adjusted session keeps its speed.
  let currentSpeed = clampSpeed(activeSession.options.speed);
  await writePlaybackSpeed(currentSpeed);

  // Kick off the first chunk's synthesis immediately, before the HUD
  // even renders. Lead-chunk + prefetch is what makes TTFA feel snappy.
  // Guarded on startIndex < chunkCount: a session at end-of-text would
  // otherwise call synthesizeSpeech("undefined") and crash.
  let pending: Promise<SynthesisResult> | null =
    startIndex < chunkCount ? startSynth(activeSession.options, activeSession.chunks[startIndex]) : null;
  // Silence any unhandled-rejection between here and the consumer await
  // — the loop will re-throw via `await pending` and surface the error
  // through the caller's catch block.
  pending?.catch(() => undefined);

  let lastMenuRefresh = 0;
  let lastPhase: PlaybackPhase | null = null;

  const speedSuffix = currentSpeed === 1 ? "" : ` · ${formatSpeed(currentSpeed)}`;
  await showHUD(
    `${isResuming ? "Resuming" : "Reading"}${previewSuffix} · ${session.text.length} chars from ${sourceLabel} (${
      startIndex + 1
    }/${chunkCount})${speedSuffix}`,
  );

  try {
    for (let i = startIndex; i < chunkCount; i++) {
      if (player.isStopped() || hasExternalStopRequest()) break;

      // Pick up any speed change made by Speed Up / Slow Down between chunks.
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
        lastMenuRefresh,
        (refreshAt) => {
          lastMenuRefresh = refreshAt;
          lastPhase = "synthesizing";
        },
      );

      let audio: SynthesisResult;
      try {
        audio = await (pending ?? startSynth(activeSession.options, activeSession.chunks[i]));
      } finally {
        pending = null;
      }

      if (player.isStopped() || hasExternalStopRequest()) break;

      // Start prefetch for chunk i+1 in parallel with playback of chunk i.
      // This is the core win: the user only ever waits for the lead chunk;
      // every subsequent chunk's synthesis is already in flight by the time
      // the previous one finishes playing.
      if (i + 1 < chunkCount) {
        pending = startSynth(activeSession.options, activeSession.chunks[i + 1]);
        // Swallow rejection so an early stop doesn't surface as
        // unhandledRejection. The next consumer await would re-throw.
        pending.catch(() => undefined);
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
        lastMenuRefresh,
        (refreshAt) => {
          lastMenuRefresh = refreshAt;
          lastPhase = "playing";
        },
      );

      await player.playAudio(audio, currentSpeed);

      if (speedChanged) {
        // Persist the latest speed to the session so Resume Last Reading
        // continues at the user's chosen pace.
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
      // Intentionally keep the live speed value so Resume Last Reading
      // picks up the user's adjusted pace.
    } else if (player.isStopped()) {
      await clearPlaybackState();
      requestMenuRefresh();
      // Same rationale: do not clear playback speed on a manual stop.
    }
  } finally {
    // Best-effort: don't leave a prefetch promise dangling. If it's already
    // settled this is a no-op; if it's pending, the .catch above keeps any
    // rejection from leaking.
    if (pending) {
      pending.catch(() => undefined);
    }
    player.cleanup();
  }
}

function startSynth(sessionOptions: TTSOptions, chunkText: string): Promise<SynthesisResult> {
  // Speed is intentionally not part of the synthesis cache key (afplay
  // applies it at playback). Pass the raw options unchanged so we hit
  // the cache regardless of current speed.
  return synthesizeSpeech(chunkText, sessionOptions);
}

async function writeStateAndMaybeRefresh(
  state: PlaybackState,
  lastPhase: PlaybackPhase | null,
  lastMenuRefresh: number,
  onRefresh: (refreshAt: number) => void,
): Promise<void> {
  await writePlaybackState(state);

  const now = Date.now();
  const phaseChanged = lastPhase !== state.phase;
  const enoughTimePassed = now - lastMenuRefresh >= MENU_REFRESH_MIN_INTERVAL_MS;
  if (phaseChanged || enoughTimePassed) {
    requestMenuRefresh();
    onRefresh(now);
  }
}

function requestMenuRefresh(): void {
  // Background-launch the menu-bar command so it re-reads playback state
  // immediately instead of waiting for its 1-minute interval. Fire-and-
  // forget; failures are non-fatal (the menu bar will catch up on its
  // next interval tick anyway).
  launchCommand({ name: "playback-status", type: LaunchType.Background }).catch(() => undefined);
}
