import { environment, getPreferenceValues } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";
import type { ScanOptions } from "./escl";

export interface FlipsidePreferences {
  scannerHost?: string;
  resolution: string;
  colorMode: string;
  saveDirectory?: string;
  openAfterSave: boolean;
}

export function getPrefs(): FlipsidePreferences {
  return getPreferenceValues<FlipsidePreferences>();
}

/** Logs to the `npm run dev` terminal in development; silent in production builds. */
export function debug(...args: unknown[]): void {
  if (environment.isDevelopment) console.log("[flipside]", ...args);
}

export function scanOptions(prefs: FlipsidePreferences): ScanOptions {
  return {
    resolution: parseInt(prefs.resolution, 10) || 300,
    colorMode: prefs.colorMode || "RGB24",
  };
}

export function defaultSaveDir(prefs: FlipsidePreferences): string {
  return prefs.saveDirectory?.trim() ? prefs.saveDirectory : join(homedir(), "Downloads");
}

/** A delay that rejects promptly when the signal aborts. */
export function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("Cancelled."));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("Cancelled."));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort);
  });
}

export function timestampName(prefix = "scan"): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.pdf`;
}
