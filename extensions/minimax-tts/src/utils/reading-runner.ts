import { showHUD } from "@raycast/api";
import { synthesizeSpeech } from "../api/minimax-tts";
import { AudioPlayer, hasExternalStopRequest } from "./audio-player";
import { formatTextSource } from "./text-source";
import { ReadingSession, saveReadingSession, updateReadingProgress } from "./reading-session";
import { buildTextPreview, clearPlaybackState, writePlaybackState } from "./playback-state";
import { clampSpeed, clearPlaybackSpeed, formatSpeed, readPlaybackSpeed, writePlaybackSpeed } from "./playback-speed";

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

      const chunkOptions = { ...activeSession.options, speed: currentSpeed };
      const audio = await synthesizeSpeech(activeSession.chunks[i], chunkOptions);
      if (player.isStopped() || hasExternalStopRequest()) break;

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
    } else if (player.isStopped()) {
      await clearPlaybackState();
      // Same rationale: do not clear playback speed on a manual stop.
    }
  } finally {
    player.cleanup();
  }
}
