import { Toast, showToast } from "@raycast/api";
import { useCallback, useState } from "react";
import type { TTSOptions } from "../api/mimo-types";
import { runSynthesisPlayback } from "../utils/mimo-synthesis-playback";
import { useAudioPlayer } from "./use-audio-player";

export function useSynthesisForm() {
  const [isLoading, setIsLoading] = useState(false);
  const { preparePlayback, stopPlayback } = useAudioPlayer();

  const handleStop = useCallback(() => {
    stopPlayback();
    setIsLoading(false);
  }, [stopPlayback]);

  const runSession = useCallback(
    async ({
      toastTitle,
      toastMessage,
      text,
      buildOptions,
      playingTitle,
      successTitle,
      successMessage,
      failureTitle,
    }: {
      toastTitle: string;
      toastMessage: string;
      text: string;
      buildOptions: () => Promise<TTSOptions>;
      playingTitle: string;
      successTitle: string;
      successMessage?: string;
      failureTitle: string;
    }) => {
      const player = await preparePlayback();
      setIsLoading(true);

      try {
        const toast = await showToast({
          style: Toast.Style.Animated,
          title: toastTitle,
          message: toastMessage,
        });
        await runSynthesisPlayback({
          player,
          text,
          buildOptions,
          toast,
          playingTitle,
          successTitle,
          successMessage,
          failureTitle,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [preparePlayback],
  );

  return { isLoading, handleStop, runSession };
}
