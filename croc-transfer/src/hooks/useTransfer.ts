import { useState, useRef, useCallback, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { CrocProcess, TransferProgress } from "../utils/process";

export type TransferState = "idle" | "starting" | "waiting" | "transferring" | "done" | "error";

interface UseTransferState {
  state: TransferState;
  phrase: string | null;
  progress: TransferProgress | null;
  error: string | null;
  cancel: () => void;
}

export function useTransfer(): UseTransferState & {
  setTransferring: () => void;
  setPhrase: (p: string) => void;
  setProgress: (p: TransferProgress) => void;
  setDone: () => void;
  setError: (msg: string) => void;
  setProcessRef: (proc: CrocProcess) => void;
} {
  const [state, setState] = useState<TransferState>("idle");
  const [phrase, setPhrase] = useState<string | null>(null);
  const [progress, setProgress] = useState<TransferProgress | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const processRef = useRef<CrocProcess | null>(null);

  const cancel = useCallback(() => {
    processRef.current?.kill();
    setState("idle");
    setPhrase(null);
    setProgress(null);
    setErrorState(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processRef.current?.kill();
    };
  }, []);

  return {
    state,
    phrase,
    progress,
    error,
    cancel,
    setTransferring: () => setState("transferring"),
    setPhrase: (p: string) => {
      setPhrase(p);
      setState("waiting");
    },
    setProgress: (p: TransferProgress) => {
      setProgress(p);
      setState("transferring");
    },
    setDone: () => {
      setState("done");
    },
    setError: (msg: string) => {
      setErrorState(msg);
      setState("error");
      showToast({ style: Toast.Style.Failure, title: "Transfer failed", message: msg });
    },
    setProcessRef: (proc: CrocProcess) => {
      processRef.current = proc;
      setState("starting");
    },
  };
}
