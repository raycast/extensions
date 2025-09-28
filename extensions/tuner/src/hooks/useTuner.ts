import { useCallback, useState, useRef } from "react";
import { soxUtils } from "../utils/sox.utils";
import { showToast, Toast } from "@raycast/api";
import { frequencyToNote, analyzeSingleChunk } from "../utils/note.utils";
import { sleep } from "../utils/general.utils";
import { CLARITY_THRESHOLD } from "../constants";

interface NoteInfo {
  noteName: string;
  cents: number;
}

export const useTuner = () => {
  const [detectedNote, setDetectedNote] = useState<NoteInfo | null>(null);
  const [error, setError] = useState<{ title: string; subTitle: string } | null>(null);
  const shouldContinueListeningRef = useRef(false);

  const startContinuousListening = useCallback(async () => {
    if (!soxUtils.isSoxInstalled()) {
      setError({
        title: "Sox not installed",
        subTitle: "Run: brew install sox",
      });

      await showToast({
        style: Toast.Style.Failure,
        title: "Sox not installed",
        message: "Run: brew install sox",
      });

      return;
    }

    shouldContinueListeningRef.current = true;

    await showToast({
      style: Toast.Style.Success,
      title: "Started listening",
      message: "Play a note on your instrument",
    });

    while (shouldContinueListeningRef.current) {
      try {
        const result = await analyzeSingleChunk();

        if (result && result.pitch > 0 && result.clarity > CLARITY_THRESHOLD) {
          const noteInfo = frequencyToNote(result.pitch);
          setDetectedNote({
            noteName: noteInfo.note,
            cents: noteInfo.cents,
          });
        } else {
          setDetectedNote(null);
        }

        await sleep(500);
      } catch (error) {
        console.log(error);
        setDetectedNote(null);
        break;
      }
    }
  }, []);

  const stopContinuousListening = useCallback(() => {
    shouldContinueListeningRef.current = false;
    setDetectedNote(null);

    showToast({
      style: Toast.Style.Success,
      title: "Stopped listening",
    });
  }, []);

  return {
    error,
    detectedNote,
    startContinuousListening,
    stopContinuousListening,
  };
};
