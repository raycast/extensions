import { useCallback, useEffect, useRef } from "react";
import type { TranscriptionStatus } from "../../store/types";

type Params = {
  status: TranscriptionStatus;
  systemReady: boolean;
  startRecording: () => Promise<void> | void;
};

export const useAutoStart = ({ status, systemReady, startRecording }: Params) => {
  const hasAutoStartedRef = useRef(false);

  useEffect(() => {
    if (!systemReady || status !== "idle" || hasAutoStartedRef.current) {
      return;
    }

    hasAutoStartedRef.current = true;
    void startRecording();
  }, [status, systemReady, startRecording]);

  const suppressAutoStart = useCallback(() => {
    hasAutoStartedRef.current = true;
  }, []);

  const allowAutoStart = useCallback(() => {
    hasAutoStartedRef.current = false;
  }, []);

  return { suppressAutoStart, allowAutoStart };
};
