import type { ApplicationInfo, NetworkSnapshot } from "../types";
import { startNettop } from "./nettop";
import { readProcesses } from "./processes";
import { UsageSession } from "./usage";

export function monitorNetwork(options: {
  applications: Promise<ApplicationInfo[]>;
  session: UsageSession;
  intervalSeconds: number;
  sampleCount?: number;
  onSnapshot: (snapshot: NetworkSnapshot) => void;
  onError: (error: Error) => void;
  onEnd?: () => void;
}): () => void {
  let disposed = false;
  let queue = Promise.resolve();
  const catalog = options.applications.then((apps) => new Map(apps.map((app) => [app.path, app])));
  // Attach rejection handling immediately, including if nettop fails before its first frame.
  void catalog.catch(() => undefined);
  const stopNettop = startNettop({
    intervalSeconds: options.intervalSeconds,
    sampleCount: options.sampleCount,
    onSample(sample) {
      queue = queue
        .then(async () => {
          if (disposed) return;
          const [processes, applications] = await Promise.all([readProcesses(), catalog]);
          if (disposed) return;
          const snapshot = options.session.ingest(sample, processes, applications, process.getuid?.() ?? -1);
          if (snapshot) options.onSnapshot(snapshot);
        })
        .catch((error: unknown) => {
          if (disposed) return;
          stop();
          options.onError(error instanceof Error ? error : new Error(String(error)));
        });
    },
    onError(error) {
      stop();
      options.onError(error);
    },
    onEnd() {
      void queue.then(() => {
        if (!disposed) options.onEnd?.();
      });
    },
  });
  function stop() {
    disposed = true;
    stopNettop();
  }
  return stop;
}

/** A fresh one-second observation. It does not share totals with the interactive command. */
export function sampleNetwork(
  applications: Promise<ApplicationInfo[]>,
  signal?: AbortSignal,
): Promise<NetworkSnapshot> {
  return new Promise((resolve, reject) => {
    let snapshot: NetworkSnapshot | null = null;
    if (signal?.aborted) {
      reject(new Error("Network sampling cancelled."));
      return;
    }
    const stop = monitorNetwork({
      applications,
      session: new UsageSession(),
      intervalSeconds: 1,
      sampleCount: 2,
      onSnapshot(value) {
        snapshot = value;
      },
      onError(error) {
        cleanup();
        reject(error);
      },
      onEnd() {
        cleanup();
        if (snapshot) resolve(snapshot);
        else reject(new Error("nettop did not return two usable samples."));
      },
    });
    function abort() {
      cleanup();
      reject(new Error("Network sampling cancelled."));
    }
    function cleanup() {
      stop();
      signal?.removeEventListener("abort", abort);
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}
