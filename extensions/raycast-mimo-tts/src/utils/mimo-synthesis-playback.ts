import { Toast } from "@raycast/api";
import type { TTSOptions } from "../api/mimo-types";
import type { AudioPlayer } from "./audio-player";
import { synthesizeSpeech } from "../api/mimo-tts";
import { showTTSFailure } from "./mimo-feedback";

export async function runSynthesisPlayback({
  player,
  text,
  buildOptions,
  toast,
  playingTitle,
  successTitle,
  successMessage,
  failureTitle,
}: {
  player: AudioPlayer;
  text: string;
  buildOptions: () => Promise<TTSOptions>;
  toast: Toast;
  playingTitle: string;
  successTitle: string;
  successMessage?: string;
  failureTitle: string;
}): Promise<void> {
  try {
    const options = await buildOptions();
    const audio = await synthesizeSpeech(text, options, player.signal);
    if (player.isStopped()) return;
    toast.title = playingTitle;
    await player.playAudio(audio, options.format, options.playbackRate);
    if (!player.isStopped()) {
      toast.style = Toast.Style.Success;
      toast.title = successTitle;
      toast.message = successMessage;
    }
  } catch (error) {
    if (!player.isStopped()) await showTTSFailure(error, failureTitle);
  }
}
