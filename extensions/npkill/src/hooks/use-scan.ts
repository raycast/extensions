import { useCallback, useEffect, useRef, useState } from "react";
import { Artifact, ScanOptions, ScanRoot, ScanStatus } from "../types";
import { scan } from "../services/scan-manager";

export function useScan(options: ScanOptions) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [status, setStatus] = useState<ScanStatus>("preparing");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string>();
  const [revision, setRevision] = useState(0);
  const current = useRef(new Map<string, Artifact>());
  const root = useRef<ScanRoot | undefined>(undefined);
  const controller = useRef<AbortController | undefined>(undefined);
  const running = useRef<Promise<void> | undefined>(undefined);
  const active = useRef(false);
  const stop = useCallback(async () => {
    controller.current?.abort();
    await running.current;
  }, []);

  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    controller.current = abort;
    active.current = true;
    current.current = new Map();
    root.current = undefined;
    setArtifacts([]);
    setWarnings([]);
    setError(undefined);
    setStatus("preparing");
    const warningList: string[] = [];
    const flush = () => {
      timer = undefined;
      if (!disposed) {
        setArtifacts([...current.current.values()]);
        setWarnings([...warningList]);
      }
    };
    const schedule = () => {
      if (!timer && !disposed) timer = setTimeout(flush, 100);
    };
    running.current = scan(options, abort.signal, {
      onRoot: (value) => {
        if (!disposed) {
          root.current = value;
          setStatus("scanning");
        }
      },
      onArtifact: (artifact) => {
        if (disposed || abort.signal.aborted || current.current.has(artifact.path)) return;
        current.current.set(artifact.path, artifact);
        schedule();
      },
      onWarning: (message) => {
        if (warningList.length < 100) warningList.push(message);
        schedule();
      },
    })
      .then((value) => {
        if (!disposed) setStatus(value);
      })
      .catch((err: unknown) => {
        if (!disposed) {
          setStatus(abort.signal.aborted ? "canceled" : "failed");
          if (!abort.signal.aborted) setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (timer) clearTimeout(timer);
        if (!disposed) {
          active.current = false;
          flush();
        }
      });
    return () => {
      disposed = true;
      abort.abort();
      if (timer) clearTimeout(timer);
    };
  }, [options, revision]);

  const refresh = useCallback(async () => {
    await stop();
    setRevision((value) => value + 1);
  }, [stop]);
  const remove = useCallback((paths: string[]) => {
    for (const path of paths) current.current.delete(path);
    setArtifacts([...current.current.values()]);
  }, []);
  return { artifacts, status, warnings, error, current, root, active, stop, refresh, remove };
}
