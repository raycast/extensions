import fs from "node:fs";
import path from "node:path";
import { ownerAlive, tryAcquireLock } from "./liveness";
import { copyPngToClipboard } from "./macos-native";
import { recomposeCaptureOutputs } from "./media-engine";
import { CaptureProjectManifest, RuntimeConfig } from "./types";

type StudioManifest = CaptureProjectManifest & { studioDirty?: boolean; studioExportError?: string };

function files(manifestPath: string) {
  const dir = path.dirname(manifestPath);
  return { lock: path.join(dir, ".studio-export.lock"), again: path.join(dir, ".studio-export.again") };
}

function read(manifestPath: string): StudioManifest | null {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as StudioManifest;
  } catch {
    return null;
  }
}

export function isStudioExportRunning(config: RuntimeConfig, manifestPath: string): boolean {
  try {
    return ownerAlive(config.supportPath, fs.readFileSync(files(manifestPath).lock, "utf-8").trim());
  } catch {
    return false;
  }
}

/**
 * Export PNG/SVG for a studio project inside the current command. Requests made
 * while an export runs are coalesced into one rerun by whichever command holds
 * the lock. Errors are stored on the manifest and shown in the studio.
 */
export async function requestStudioExport(manifestPath: string, config: RuntimeConfig): Promise<void> {
  const { lock, again } = files(manifestPath);
  fs.writeFileSync(again, "");
  const release = tryAcquireLock(config.supportPath, lock);
  if (!release) return;
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
          config.supportPath,
          config.ffmpegPath,
          config.bypassProxy,
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
    if (exported && config.copyToClipboard && final && !final.studioDirty) {
      await copyPngToClipboard(config.supportPath, final.subbedPngPath).catch(() => undefined);
    }
  } finally {
    release();
  }
  // A request may arrive between the last check and releasing the lock.
  if (fs.existsSync(again) && read(manifestPath)?.studioDirty) await requestStudioExport(manifestPath, config);
}
