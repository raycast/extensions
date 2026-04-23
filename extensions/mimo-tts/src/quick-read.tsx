import { getSelectedText, showHUD } from "@raycast/api";
import { chunkText } from "./utils/text-chunker";
import { AudioPlayer, stopExternalPlayback } from "./utils/audio-player";
import { showTTSFailure } from "./utils/feedback";
import { buildDefaultOptionsFromPrefs } from "./utils/voice-preferences";
import { playChunksWithLookahead } from "./utils/pipelined-reading";

export default async function QuickRead() {
  // Toggle: if our afplay is already running, stop it and return
  const wasPlaying = stopExternalPlayback();
  if (wasPlaying) {
    await showHUD("⏹ Stopped");
    return;
  }

  const player = new AudioPlayer();

  try {
    const selectedText = await getSelectedText().catch(() => "");

    if (!selectedText.trim()) {
      await showHUD("No text selected");
      return;
    }

    const options = await buildDefaultOptionsFromPrefs();
    const chunks = chunkText(selectedText);

    await showHUD(`Reading ${selectedText.length} chars (${chunks.length} chunks)...`);

    await playChunksWithLookahead(chunks, options, player);

    if (!player.isStopped()) {
      await showHUD("Playback complete");
    }
  } catch (error) {
    await showTTSFailure(error);
  } finally {
    player.cleanup();
  }
}
