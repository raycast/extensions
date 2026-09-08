import { useCallback, useEffect, useRef, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import { RecentEntry } from "../lib/recent-files";
import { loadRecentEntries } from "../lib/recent-setup";
import {
  loadSearchSetup,
  confirmSearchSetup,
  runSearchSetup,
  skipSearchSetup,
  SetupState,
  SetupStep,
} from "../lib/search-setup";
import { dataGeneration } from "../lib/storage-lock";

/** Command-owned setup survives folder navigation without retaining old views. */
export function useSearchSetup(reloadKey: number, onIndexed?: () => void) {
  const [seed, setSeed] = useState<RecentEntry[]>([]);
  const [setup, setSetup] = useState<SetupState>({
    recents: false,
    drive: false,
    hasRun: false,
  });
  const [stage, setStage] = useState<SetupStep>();
  const [progress, setProgress] = useState("");
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const mounted = useRef(true);
  const importingRef = useRef(false);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    const generation = dataGeneration();
    const current = () => !cancelled && generation === dataGeneration();
    setLoading(true);
    setSeed(loadRecentEntries());
    void loadSearchSetup()
      .then((value) => {
        if (current()) setSetup(value);
      })
      .catch(() => {
        if (current()) setSetup({ recents: false, drive: false, hasRun: true });
      })
      .finally(() => {
        if (current()) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const start = useCallback(async () => {
    if (importingRef.current) return;
    const generation = dataGeneration();
    const current = () => mounted.current && generation === dataGeneration();
    importingRef.current = true;
    try {
      const latest = await loadSearchSetup();
      if (!current()) return;
      const rerun = !latest.recents && !latest.drive;
      const requested = rerun ? { recents: true, drive: true } : latest;
      if (!(await confirmSearchSetup(requested)) || !current()) return;
      const active = new AbortController();
      controller.current = active;
      setImporting(true);
      await runSearchSetup({
        signal: active.signal,
        generation,
        rerun,
        onStage: (step) => {
          if (!current()) return;
          setSetup((previous) => ({ ...previous, hasRun: true }));
          setStage(step);
          setProgress(
            step === "recents"
              ? "Reading last week's documents and nearby files…"
              : "Reading Google Drive shortcuts and shared folders…",
          );
        },
        onRecentProgress: (entries) => {
          if (current() && !active.signal.aborted) setSeed(entries);
        },
        onStatus: (message) => {
          if (current() && !active.signal.aborted) setProgress(message);
        },
      });
      const nextSetup = await loadSearchSetup();
      if (current()) {
        setSetup(nextSetup);
        setSeed(loadRecentEntries());
        onIndexed?.();
      }
    } catch {
      if (mounted.current)
        await showToast({
          style: Toast.Style.Failure,
          title: "Search setup could not finish",
          message:
            "Saved progress was kept. Choose Set Up Search in Actions to retry.",
        });
    } finally {
      importingRef.current = false;
      if (mounted.current) {
        setImporting(false);
        setStage(undefined);
        setProgress("");
      }
    }
  }, [onIndexed]);
  const skip = useCallback(async (step: SetupStep) => {
    if (importingRef.current) return;
    const generation = dataGeneration();
    importingRef.current = true;
    try {
      if (await skipSearchSetup(step, generation)) {
        const nextSetup = await loadSearchSetup();
        if (mounted.current && generation === dataGeneration())
          setSetup(nextSetup);
      }
    } finally {
      importingRef.current = false;
    }
  }, []);
  return {
    offered: !loading && !setup.hasRun,
    setup,
    stage,
    progress,
    importing,
    start,
    skip,
    cancel: () => controller.current?.abort(),
    seed,
    loading,
  };
}

export type SearchSetup = ReturnType<typeof useSearchSetup>;
