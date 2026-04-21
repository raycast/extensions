import { showHUD } from "@raycast/api";
import { synthesizeSpeech } from "../api/minimax-tts";
import { AudioPlayer, hasExternalStopRequest } from "./audio-player";
import { formatTextSource } from "./text-source";
import { ReadingSession, updateReadingProgress } from "./reading-session";

export async function playReadingSession(session: ReadingSession, isResuming = false): Promise<void> {
  const player = new AudioPlayer();
  let activeSession = session;
  const chunkCount = session.chunks.length;
  const startIndex = Math.min(session.nextChunkIndex, chunkCount);

  if (chunkCount === 0) {
    await showHUD("No text to read");
    return;
  }

  try {
    await showHUD(
      `${isResuming ? "Resuming" : "Reading"} ${session.text.length} chars from ${formatTextSource(
        session.source,
      )} (${startIndex + 1}/${chunkCount})`,
    );

    for (let i = startIndex; i < chunkCount; i++) {
      if (player.isStopped() || hasExternalStopRequest()) break;

      const audio = await synthesizeSpeech(activeSession.chunks[i], activeSession.options);
      if (player.isStopped() || hasExternalStopRequest()) break;

      await player.playAudio(audio);
      activeSession = await updateReadingProgress(activeSession, i + 1);

      if (hasExternalStopRequest()) {
        break;
      }
    }

    if (activeSession.nextChunkIndex >= chunkCount && !player.isStopped() && !hasExternalStopRequest()) {
      await showHUD("Playback complete");
    } else if (hasExternalStopRequest()) {
      await showHUD(`Stopped; next chunk ${Math.min(activeSession.nextChunkIndex + 1, chunkCount)}/${chunkCount}`);
    }
  } finally {
    player.cleanup();
  }
}
