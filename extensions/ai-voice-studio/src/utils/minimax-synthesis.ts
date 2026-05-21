import { synthesizeSpeech } from "../api/minimax-tts";
import type { TTSOptions } from "../api/types";
import { AudioPlayer, hasExternalStopRequest } from "./audio-player";

export interface MiniMaxSynthesisJob {
  promise: Promise<string | null>;
  cancel: () => void;
}

export async function synthesizeMiniMaxChunk(
  text: string,
  options: TTSOptions,
  player: AudioPlayer,
): Promise<string | null> {
  return startMiniMaxSynthesisJob(text, options, player).promise;
}

export function startMiniMaxSynthesisJob(text: string, options: TTSOptions, player: AudioPlayer): MiniMaxSynthesisJob {
  const controller = new AbortController();
  const stopPoll = setInterval(() => {
    if (player.isStopped() || hasExternalStopRequest()) {
      controller.abort();
    }
  }, 100);

  const promise = synthesizeSpeech(text, options, controller.signal)
    .catch((error) => {
      if (controller.signal.aborted || player.isStopped() || hasExternalStopRequest()) {
        return null;
      }
      throw error;
    })
    .finally(() => {
      clearInterval(stopPoll);
    });

  return {
    promise,
    cancel: () => controller.abort(),
  };
}
