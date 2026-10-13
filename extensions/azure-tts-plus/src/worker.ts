/**
 * The background worker. It is not a Raycast command and never talks to Raycast.
 *
 * The reader panel writes `request.json` when the user picks a speed from the chips or
 * clicks a word that sits behind the audio being played; this process picks it up and
 * re-synthesises. The panel is a PowerShell window with no engine of its own, and the
 * detour through here exists because every `raycast://` link pulls the Raycast window
 * to the front — measured at 3.0s and one stolen foreground per tap, and still a flash
 * with launchType=background. Through here the same change lands in well under a
 * second, with nothing on screen.
 *
 * It is bundled into `assets/worker.mjs` by `esbuild.mjs`, so it carries its own copy
 * of the Azure SDK and needs nothing from `node_modules` at run time.
 */
import fs from "node:fs";
import path from "node:path";
import { applyRate, seekTo } from "./lib/reading.js";
import {
  WorkerBeat,
  readJson,
  readLiveHeartbeat,
  lockFile,
  readLiveStatus,
  readRequest,
  readRequestSeq,
  requestFile,
  workerFile,
  writeJsonAtomic,
} from "./lib/state.js";

const [, , assetsDirArg, stampArg] = process.argv;
const assetsDir = assetsDirArg || path.dirname(process.argv[1] ?? ".");
const stamp = stampArg || "none";

const key = process.env.AZURE_TTS_KEY?.trim();
const region = process.env.AZURE_TTS_REGION?.trim() || "eastus2";
const env = {
  assetsDir,
  credentials: key ? { key, region } : undefined,
};
// The key is in this process and nowhere else. Drop it from the environment block so
// it does not travel into the PowerShell children we spawn for the Windows engine.
delete process.env.AZURE_TTS_KEY;

const beatEveryMs = 1000;
const pollEveryMs = 60;
/** Nothing read for this long and the worker gives its memory back. */
const idleTimeoutMs = 120_000;

const log = (message: string) => {
  try {
    fs.appendFileSync(
      path.join(path.dirname(requestFile), "worker.log"),
      `${new Date().toISOString()}  ${message}\n`,
      "utf8",
    );
  } catch {
    // Logging must never be the reason a speed change fails.
  }
};

/**
 * One worker at a time, enforced twice.
 *
 * The startup check alone is not enough: two workers that survive it both apply the
 * same request, and a single click on a speed chip lands twice. That happened, so
 * ownership is also re-checked before every request — `worker.json` is the token, and
 * whoever is not holding it stands down.
 */
const claim = (): boolean => {
  const existing = readLiveHeartbeat<WorkerBeat>(workerFile);
  if (existing && existing.pid !== process.pid) return false;
  try {
    // 'wx' fails if the lock is there: an atomic test-and-set, unlike a check
    // followed by a write, which two workers can both pass.
    fs.writeFileSync(lockFile, String(process.pid), { flag: "wx" });
    return true;
  } catch {
    const holder = Number(fs.readFileSync(lockFile, "utf8").trim());
    if (holder === process.pid) return true;
    // A lock left behind by a worker that was killed. Nobody is beating; take it.
    if (!existing) {
      fs.rmSync(lockFile, { force: true });
      try {
        fs.writeFileSync(lockFile, String(process.pid), { flag: "wx" });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
};

const owns = () => readJson<WorkerBeat>(workerFile)?.pid === process.pid;

const beat = () =>
  writeJsonAtomic(workerFile, {
    pid: process.pid,
    ts: Date.now(),
    stamp,
  } satisfies WorkerBeat);

const retire = (why: string) => {
  log(why);
  clearInterval(heartbeat);
  clearInterval(loop);
  if (owns()) {
    fs.rmSync(workerFile, { force: true });
    fs.rmSync(lockFile, { force: true });
  }
  process.exit(0);
};

if (!claim()) {
  log(`another worker holds the lock; exiting (pid ${process.pid})`);
  process.exit(0);
}

// Adopt the sequence already on disk without acting on it: a worker that replayed the
// last session's request would change the speed of a reading nobody asked it to touch.
let lastSeq = readRequestSeq();
let busy = false;
let lastActivity = Date.now();

beat();
log(
  `worker up (pid ${process.pid}, seq ${lastSeq}, azure ${env.credentials ? "yes" : "no"})`,
);

const heartbeat = setInterval(beat, beatEveryMs);

const tick = async () => {
  if (busy) return;

  if (readLiveStatus()) lastActivity = Date.now();
  else if (Date.now() - lastActivity > idleTimeoutMs) {
    retire("idle; exiting");
    return;
  }

  // A malformed payload still moves the sequence forward: retrying a request nobody
  // can parse would mean re-reading it sixteen times a second, forever.
  const seq = readRequestSeq();
  if (seq <= lastSeq) return;
  // Another worker took the token while we were sleeping. Acting now would apply the
  // same request twice and move the speed by two steps on a single click.
  if (!owns()) {
    retire(`lost the token to another worker; exiting (pid ${process.pid})`);
    return;
  }
  lastSeq = seq;
  lastActivity = Date.now();

  const request = readRequest();
  if (!request) {
    log(`request ${seq}: unreadable payload, ignored`);
    return;
  }

  busy = true;
  try {
    if (request.kind === "rate") {
      const outcome = await applyRate(env, request.rate);
      log(
        `request ${seq} rate ${request.rate}x: ${outcome.kind} at ${outcome.rate}x`,
      );
    } else {
      const outcome = await seekTo(env, request.pos);
      log(`request ${seq} seek to ${request.pos}: ${outcome.kind}`);
    }
  } catch (error) {
    log(`request ${seq} failed: ${String(error)}`);
  } finally {
    busy = false;
  }
};

const loop = setInterval(() => {
  void tick();
}, pollEveryMs);
