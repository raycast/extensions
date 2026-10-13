import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import { AzureCredentials } from "./settings.js";
import {
  Job,
  WorkerBeat,
  ensureDirs,
  jobFile,
  lockFile,
  pruneAudio,
  readJson,
  readLiveHeartbeat,
  readLiveStatus,
  stateDir,
  workerFile,
  writeJsonAtomic,
} from "./state.js";
import { assetPath, powershell } from "./synth.js";

/**
 * Start a process that has to outlive this command, and wait only for the launcher.
 *
 * `stdio: "ignore"` is the load-bearing part. With pipes, `start`'s grandchild inherits
 * them and this promise stays open until that grandchild dies — measured at 8.3s for an
 * 8s child, and at over a minute for the reader. That delay lands exactly where it hurts
 * most: on the first reading, the worker that answers the panel would not be spawned
 * until the reading was already over.
 *
 * `/b` and not `/min`, fixed 15/08/2026. `windowsHide: true` only covers the cmd.exe that
 * Node spawns; `start` then creates the grandchild in a console window of its very own,
 * which that flag never reaches. `/min` merely asked for it minimised — so every reading
 * dropped a "Windows PowerShell" console onto the taskbar. reader.ps1 does hide it, but
 * only on line 45, after PowerShell has booted and Add-Type has compiled: several hundred
 * milliseconds of window that the user sees and cannot dismiss.
 *
 * `/b` creates no window at all. The grandchild inherits cmd's console, which was born
 * invisible under CREATE_NO_WINDOW, and keeps it alive after cmd exits — so the reader
 * survives exactly as it did before. The process topology is untouched; only the window
 * is gone.
 */
const startDetached = (
  command: string,
  args: string[],
  env?: NodeJS.ProcessEnv,
) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(
      "cmd.exe",
      ["/c", "start", "", "/b", command, ...args],
      { windowsHide: true, stdio: "ignore", env },
    );
    child.once("error", reject);
    child.once("exit", () => resolve());
  });

/**
 * What actually lands in job.json. Word timings travel as three flat number arrays:
 * Windows PowerShell's ConvertFrom-Json takes about a second on a few thousand objects
 * and a few milliseconds on the same data as plain arrays.
 */
type ReaderJob = {
  id: string;
  wav: string;
  text: string;
  charOffset: number;
  rate: number;
  label: string;
  continuation: boolean;
  overlay: boolean;
  ms: number[];
  pos: number[];
  len: number[];
};

/**
 * The reader is a detached WPF process that owns both the audio and the overlay window.
 * It survives between Raycast commands so a speed change swaps the audio without a flash.
 */
/**
 * Getting a long-lived PowerShell out of a short-lived Raycast command on Windows took
 * three tries, so the reasoning is worth keeping:
 *
 *   detached: true   -> DETACHED_PROCESS, no console at all. PowerShell never starts.
 *   plain spawn      -> shares this command's console and dies with it, mid-sentence.
 *   cmd /c start /b  -> cmd's own invisible console, handed over. Survives, and shows
 *                       nothing. `/min` did the same but put a window on the taskbar.
 */
export const ensureReader = async (assetsDir: string) => {
  if (readLiveStatus()) return;
  // Awaited on purpose: cmd exits in a few dozen milliseconds, but if this command
  // returns first, Raycast tears the process down before `start` has created anything.
  await startDetached(powershell, [
    "-NoProfile",
    "-NonInteractive",
    "-STA",
    "-ExecutionPolicy",
    "Bypass",
    "-WindowStyle",
    "Hidden",
    "-File",
    assetPath(assetsDir, "reader.ps1"),
    "-StateDir",
    stateDir,
  ]);
};

export const submitJob = async (
  job: Job,
  overlay: boolean,
  assetsDir: string,
) => {
  ensureDirs();
  pruneAudio([job.wav]);
  const readerJob: ReaderJob = {
    id: job.id,
    wav: job.wav,
    text: job.text,
    charOffset: job.charOffset,
    rate: job.rate,
    label: job.label,
    continuation: job.continuation,
    overlay,
    ms: job.words.map((word) => word.ms),
    pos: job.words.map((word) => word.pos),
    len: job.words.map((word) => word.len),
  };
  writeJsonAtomic(jobFile, readerJob);
  await ensureReader(assetsDir);
};

/** The text the reader is holding right now — the source for a speed change. */
export const readCurrentJob = () => readJson<ReaderJob>(jobFile);

/**
 * A fingerprint of the Azure credentials, never the credentials. It only has to
 * answer one question: is the worker still holding the key the user has today?
 */
export const credentialsStamp = (credentials: AzureCredentials | undefined) =>
  credentials
    ? crypto
        .createHash("sha256")
        .update(`${credentials.key}|${credentials.region}`)
        .digest("hex")
        .slice(0, 16)
    : "none";

/**
 * The worker exists for one reason: a `raycast://` link always pulls the Raycast window
 * to the front, and doing that every time a speed chip is clicked is unusable. It is
 * measured — 3.0s and a stolen foreground through Raycast, 0.6s and still a flash with
 * launchType=background. So the reader panel writes `request.json` instead, and this
 * process, which nobody can see, does the re-synthesis.
 *
 * The Azure key travels in the environment block: never a file, never a command line.
 */
export const ensureWorker = async (
  assetsDir: string,
  credentials: AzureCredentials | undefined,
) => {
  const stamp = credentialsStamp(credentials);
  const beat = readLiveHeartbeat<WorkerBeat>(workerFile);
  if (beat) {
    if (beat.stamp === stamp) return;
    // The key changed under it. It holds no unsaved state, so ending it is safe.
    try {
      process.kill(beat.pid);
    } catch {
      // Already gone.
    }
    // Clear the token and the lock ourselves: the process we just ended had no
    // chance to, and the replacement would stand down in front of them.
    fs.rmSync(workerFile, { force: true });
    fs.rmSync(lockFile, { force: true });
  }
  await startDetached(
    process.execPath,
    [assetPath(assetsDir, "worker.mjs"), assetsDir, stamp],
    {
      ...process.env,
      AZURE_TTS_KEY: credentials?.key ?? "",
      AZURE_TTS_REGION: credentials?.region ?? "",
    },
  );
};
