import { environment } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  cancelAudioRecording,
  removeAudioFile,
  startAudioRecording,
  stopAudioRecording,
  type AudioRecordingSession,
} from "./audio";

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string>();
  const sessionRef = useRef<AudioRecordingSession | undefined>(undefined);
  const startPromiseRef = useRef<Promise<void> | undefined>(undefined);
  const durationTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isMountedRef = useRef(true);

  const clearDurationTimer = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current);
      durationTimerRef.current = undefined;
    }
  }, []);

  const startRecording = useCallback((): Promise<void> => {
    if (sessionRef.current) {
      return Promise.resolve();
    }

    if (startPromiseRef.current) {
      return startPromiseRef.current;
    }

    const startPromise = (async () => {
      setError(undefined);
      setDuration(0);

      const session = await startAudioRecording(environment.supportPath);
      if (!isMountedRef.current) {
        await cancelAudioRecording(session);
        return;
      }

      sessionRef.current = session;
      setIsRecording(true);

      const handleUnexpectedClose = (code: number | null) => {
        if (sessionRef.current !== session || session.stopRequested) {
          return;
        }

        sessionRef.current = undefined;
        clearDurationTimer();
        setIsRecording(false);
        setError(unexpectedExitMessage(code, session.stderr));
        void removeAudioFile(session.filePath);
      };

      durationTimerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - session.startedAt) / 1_000));
      }, 1_000);

      session.process.once("close", handleUnexpectedClose);
      if (session.process.exitCode !== null || session.process.signalCode !== null) {
        handleUnexpectedClose(session.process.exitCode);
      }
    })();

    startPromiseRef.current = startPromise;
    const clearStartPromise = () => {
      if (startPromiseRef.current === startPromise) {
        startPromiseRef.current = undefined;
      }
    };
    startPromise.then(clearStartPromise, clearStartPromise);

    return startPromise;
  }, [clearDurationTimer]);

  const stopRecording = useCallback(async (): Promise<string> => {
    const session = sessionRef.current;
    if (!session) {
      throw new Error("No recording is active.");
    }

    clearDurationTimer();
    setIsRecording(false);

    try {
      return await stopAudioRecording(session);
    } finally {
      sessionRef.current = undefined;
    }
  }, [clearDurationTimer]);

  const cancelRecording = useCallback(async () => {
    const session = sessionRef.current;
    sessionRef.current = undefined;
    clearDurationTimer();
    setIsRecording(false);

    if (session) {
      await cancelAudioRecording(session);
    }
  }, [clearDurationTimer]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      const session = sessionRef.current;
      sessionRef.current = undefined;
      clearDurationTimer();

      if (session) {
        void cancelAudioRecording(session);
      }
    };
  }, [clearDurationTimer]);

  return {
    isRecording,
    duration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

function unexpectedExitMessage(code: number | null, stderr: string): string {
  const compactError = stderr.replace(/\s+/g, " ").trim();
  if (compactError) {
    return `The recording stopped: ${compactError.slice(-220)}`;
  }

  return `The recording stopped unexpectedly${code === null ? "." : ` (code ${code}).`}`;
}
