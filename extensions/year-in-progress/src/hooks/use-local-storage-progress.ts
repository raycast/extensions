import { showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProgressSnapshot } from "../types";
import { readProgress } from "../utils/progress-store";

export function useLocalStorageProgress() {
  const mounted = useRef(true);
  const lastWarning = useRef("");
  const loadSequence = useRef(0);
  const [state, setState] = useState<ProgressSnapshot & { isLoading: boolean }>({
    isLoading: true,
    allProgress: [],
    commandProgressId: "default:year",
    currMenubarProgressId: null,
    storageWarnings: [],
  });

  const reload = useCallback(async () => {
    const sequence = ++loadSequence.current;
    const snapshot = await readProgress();
    if (mounted.current && sequence === loadSequence.current) {
      setState({ ...snapshot, isLoading: false });
      const warning = snapshot.storageWarnings.join(" ");
      if (warning && warning !== lastWarning.current) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Some Progress Could Not Be Loaded",
          message: warning,
        }).catch(() => undefined);
      }
      lastWarning.current = warning;
    }
    return snapshot;
  }, []);

  useEffect(() => {
    mounted.current = true;
    const load = async () => {
      try {
        await reload();
      } catch (error) {
        if (mounted.current) {
          setState((previous) => ({ ...previous, isLoading: false }));
          await showToast({
            style: Toast.Style.Failure,
            title: "Could Not Load Progress",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    };
    void load();
    const interval = setInterval(() => void load(), 60_000);
    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [reload]);

  return { state, reload };
}
