import { getSelectedText, showHUD, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { TTSApiError } from "./api/volcengine-tts";
import { chunkText } from "./utils/text-chunker";
import { AudioPlayer, stopExternalPlayback } from "./utils/audio-player";
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

    await showHUD(`🎙️ Reading ${selectedText.length} chars (${chunks.length} chunks)...`);

    await playChunksWithLookahead(chunks, options, player);

    if (!player.isStopped()) {
      await showHUD("✓ Playback complete");
    }
  } catch (error) {
    if (error instanceof TTSApiError) {
      if (error.code === -1) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Configuration Required",
          message: error.message,
          primaryAction: { title: "Open Preferences", onAction: () => openExtensionPreferences() },
        });
        return;
      }
      await showHUD(`TTS error: ${error.message}`);
      return;
    }

    await showHUD(`Error: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    player.cleanup();
  }
}
