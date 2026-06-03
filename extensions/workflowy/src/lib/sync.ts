import { spawn } from "node:child_process";
import { getDatabasePath, getWorkerPath } from "./paths";
import { getPreferences } from "./preferences";
import { getCachedNodeCount, isCacheStale } from "./cache";
import type { SyncProgressEvent } from "./nodes";

export interface SyncResult {
  nodeCount: number;
}

let activeSync: Promise<SyncResult> | null = null;

export function maybeStartBackgroundSync(onEvent?: (event: SyncProgressEvent) => void): Promise<SyncResult> | null {
  const preferences = getPreferences();
  const needsSync = getCachedNodeCount() === 0 || isCacheStale(preferences.cacheStaleMinutes);
  if (!needsSync) return null;
  return syncCache(onEvent);
}

export function syncCache(onEvent?: (event: SyncProgressEvent) => void): Promise<SyncResult> {
  if (activeSync) return activeSync;

  const { apiKey } = getPreferences();
  if (!apiKey) {
    throw new Error("Missing Workflowy API key.");
  }

  activeSync = new Promise<SyncResult>((resolve, reject) => {
    const child = spawn(process.execPath, [getWorkerPath(), "--db", getDatabasePath()], {
      env: {
        ...process.env,
        WORKFLOWY_API_KEY: apiKey,
        NODE_NO_WARNINGS: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";
    let stdoutBuffer = "";

    const handleLine = (line: string) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      try {
        const event = JSON.parse(trimmed) as SyncProgressEvent;
        onEvent?.(event);
        if (event.type === "done") {
          resolve({ nodeCount: event.nodeCount ?? 0 });
        } else if (event.type === "error") {
          reject(new Error(event.message || "Sync failed."));
        } else if (event.type === "rate-limit") {
          reject(new Error(event.message || `Rate limit — wait ${event.remainingSeconds ?? 0}s`));
        }
      } catch {
        stderr += `${trimmed}\n`;
      }
    };

    child.stdout.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) handleLine(line);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (stdoutBuffer.trim()) handleLine(stdoutBuffer);
      if (code === 0) return;
      reject(new Error(stderr.trim() || `Sync worker exited with code ${code}`));
    });
  }).finally(() => {
    activeSync = null;
  });

  return activeSync;
}
