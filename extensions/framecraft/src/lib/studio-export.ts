import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { resolveNodeBinary } from "./env";
import { copyPngToClipboard } from "./macos-native";
import { recomposeCaptureOutputs } from "./media-engine";
import { CaptureProjectManifest, RuntimeConfig } from "./types";

type StudioManifest = CaptureProjectManifest & { studioDirty?: boolean; studioExportError?: string };

export interface StudioExportOptions {
  supportPath: string;
  ffmpegPath: string;
  bypassProxy: boolean;
  copyToClipboard: boolean;
}

function files(manifestPath: string) {
  const dir = path.dirname(manifestPath);
  return { lock: path.join(dir, ".studio-export.lock"), again: path.join(dir, ".studio-export.again") };
}

function alive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function read(manifestPath: string): StudioManifest | null {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as StudioManifest;
  } catch {
    return null;
  }
}

export function isStudioExportRunning(manifestPath: string): boolean {
  try {
    return alive(Number(fs.readFileSync(files(manifestPath).lock, "utf-8")));
  } catch {
    return false;
  }
}

/**
 * Export PNG/SVG in a detached worker so it finishes even when Raycast closes
 * the studio. Requests made while an export runs are coalesced into one rerun.
 */
export async function requestStudioExport(manifestPath: string, config: RuntimeConfig): Promise<void> {
  fs.writeFileSync(files(manifestPath).again, "");
  if (isStudioExportRunning(manifestPath)) return;
  const options: StudioExportOptions = {
    supportPath: config.supportPath,
    ffmpegPath: config.ffmpegPath,
    bypassProxy: config.bypassProxy,
    copyToClipboard: config.copyToClipboard,
  };
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      resolveNodeBinary(),
      [path.join(config.assetsPath, "worker.cjs"), "--export", manifestPath, JSON.stringify(options)],
      {
        detached: true,
        stdio: "ignore",
      },
    );
    child.once("error", () =>
      reject(new Error("Couldn't start the background export process. Check your Node installation.")),
    );
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

export async function runStudioExport(manifestPath: string, options: StudioExportOptions): Promise<void> {
  const { lock, again } = files(manifestPath);
  try {
    fs.writeFileSync(lock, String(process.pid), { flag: "wx" });
  } catch {
    if (isStudioExportRunning(manifestPath)) return;
    fs.writeFileSync(lock, String(process.pid));
  }
  let exported = false;
  try {
    while (fs.existsSync(again)) {
      fs.rmSync(again, { force: true });
      const manifest = read(manifestPath);
      if (!manifest?.studioDirty) continue;
      const snapshot = JSON.stringify(manifest.layers);
      try {
        await recomposeCaptureOutputs(
          structuredClone(manifest),
          options.supportPath,
          options.ffmpegPath,
          options.bypassProxy,
          true,
        );
        exported = true;
        const latest = read(manifestPath);
        if (latest && !fs.existsSync(again) && JSON.stringify(latest.layers) === snapshot) {
          latest.studioDirty = false;
          delete latest.studioExportError;
          fs.writeFileSync(manifestPath, JSON.stringify(latest, null, 2), "utf-8");
        }
      } catch (error) {
        const latest = read(manifestPath);
        if (latest) {
          latest.studioExportError = error instanceof Error ? error.message : String(error);
          fs.writeFileSync(manifestPath, JSON.stringify(latest, null, 2), "utf-8");
        }
      }
    }
    const final = read(manifestPath);
    if (exported && options.copyToClipboard && final && !final.studioDirty) {
      await copyPngToClipboard(options.supportPath, final.subbedPngPath).catch(() => undefined);
    }
  } finally {
    try {
      if (fs.readFileSync(lock, "utf-8") === String(process.pid)) fs.rmSync(lock, { force: true });
    } catch {
      /* Already gone. */
    }
  }
  // A request may arrive between the last check and releasing the lock.
  if (fs.existsSync(again) && read(manifestPath)?.studioDirty) await runStudioExport(manifestPath, options);
}
