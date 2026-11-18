import { useState, useRef, useCallback, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { CrocProcess, TransferProgress } from "../utils/process";
import { addRecord } from "../utils/history";

export type TransferState =
  | "form"
  | "zipping"
  | "starting"
  | "waiting"
  | "transferring"
  | "done"
  | "error";

interface UseTransferResult {
  state: TransferState;
  phrase: string | null;
  progress: TransferProgress | null;
  error: string | null;
  cancel: (files: string[]) => void;
  setForm: () => void;
  setZipping: () => void;
  setStarting: (proc: CrocProcess) => void;
  setPhrase: (p: string) => void;
  setProgress: (p: TransferProgress) => void;
  setDone: () => void;
  setError: (msg: string) => void;
}

export function useTransfer(): UseTransferResult {
  const [state, setState] = useState<TransferState>("form");
  const [phrase, setPhraseState] = useState<string | null>(null);
  const [progress, setProgressState] = useState<TransferProgress | null>(null);
  const [error, setErrorState] = useState<string | null>(null);
  const processRef = useRef<CrocProcess | null>(null);
  const phraseRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      processRef.current?.kill();
    };
  }, []);

  const cancel = useCallback((files: string[]) => {
    processRef.current?.kill();
    const currentPhrase = phraseRef.current;
    if (currentPhrase) {
      addRecord({
        type: "send",
        files,
        phrase: currentPhrase,
        status: "cancelled",
      });
    }
    setState("form");
    setPhraseState(null);
    setProgressState(null);
    setErrorState(null);
    phraseRef.current = null;
    processRef.current = null;
  }, []);

  return {
    state,
    phrase,
    progress,
    error,
    cancel,
    setForm: () => {
      setState("form");
      setPhraseState(null);
      setProgressState(null);
      setErrorState(null);
      phraseRef.current = null;
    },
    setZipping: () => setState("zipping"),
    setStarting: (proc: CrocProcess) => {
      processRef.current = proc;
      setState("starting");
    },
    setPhrase: (p: string) => {
      phraseRef.current = p;
      setPhraseState(p);
      setState("waiting");
    },
    setProgress: (p: TransferProgress) => {
      setProgressState(p);
      setState("transferring");
    },
    setDone: () => setState("done"),
    setError: (msg: string) => {
      setErrorState(msg);
      setState("error");
      showToast({
        style: Toast.Style.Failure,
        title: "Transfer failed",
        message: msg,
      });
    },
  };
}
