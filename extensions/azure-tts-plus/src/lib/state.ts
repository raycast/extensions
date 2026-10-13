import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** One spoken word, anchored both in the audio and in the original text. */
export type Word = {
  /** Milliseconds from the start of this job's wav file. */
  ms: number;
  /** Character index inside `Job.text` (absolute, already includes `charOffset`). */
  pos: number;
  /** Length of the word in characters. */
  len: number;
};

export type Engine = "azure" | "windows";

/** A single piece of audio the reader has to play, plus everything it needs to draw. */
export type Job = {
  id: string;
  /** Absolute path of the wav file to play. */
  wav: string;
  /** The full original text, so the overlay can show what came before and after. */
  text: string;
  /** Where `wav` starts inside `text`. Everything before it is drawn as already read. */
  charOffset: number;
  rate: number;
  engine: Engine;
  /** Short label drawn in the overlay header, e.g. "AZURE · FRANCISCA · 1.2x". */
  label: string;
  /** True when the job continues a reading that was already on screen (speed change). */
  continuation: boolean;
  words: Word[];
};

export type PlayerState = "idle" | "starting" | "playing" | "paused";

export type Status = {
  pid: number;
  state: PlayerState;
  jobId: string;
  posMs: number;
  /** Index into the current job's `words`, or -1 before the first word. */
  wordIndex: number;
  /** Absolute character position inside `Job.text`. */
  charPos: number;
  /** Epoch milliseconds of the last heartbeat. */
  ts: number;
};

export type Control = {
  seq: number;
  cmd: "pause" | "resume" | "toggle-pause" | "stop";
};

export const stateDir = path.join(
  process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
  "azure-tts-plus",
);
export const audioDir = path.join(stateDir, "audio");
export const jobFile = path.join(stateDir, "job.json");
export const statusFile = path.join(stateDir, "status.json");
export const controlFile = path.join(stateDir, "control.json");
export const settingsFile = path.join(stateDir, "settings.json");
/** The reader panel drops its requests here; they never have to go through Raycast. */
export const requestFile = path.join(stateDir, "request.json");
/** Heartbeat of the background worker that serves `requestFile`. */
export const workerFile = path.join(stateDir, "worker.json");
/** Exclusive-create lock: two workers applying the same request move the speed by 0.2x. */
export const lockFile = path.join(stateDir, "worker.lock");
/** Present only while audio is actually coming out. */
export const activeFlag = path.join(stateDir, "active.flag");
export const readerLog = path.join(stateDir, "reader.log");
/** Failures from the Raycast commands. A HUD disappears; this does not. */
export const extensionLog = path.join(stateDir, "extension.log");

export const logFailure = (where: string, error: unknown) => {
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    const detail =
      error instanceof Error
        ? `${error.message}\n${error.stack ?? ""}`
        : String(error);
    fs.appendFileSync(
      extensionLog,
      `${new Date().toISOString()}  ${where}: ${detail}\n`,
      "utf8",
    );
  } catch {
    // Diagnostics must never be the reason a command fails.
  }
};

export const ensureDirs = () => {
  fs.mkdirSync(audioDir, { recursive: true });
};

/** Write through a temp file so a reader polling the path never sees half a document. */
export const writeJsonAtomic = (file: string, value: unknown) => {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value), "utf8");
  fs.renameSync(tmp, file);
};

export const readJson = <T>(file: string): T | undefined => {
  try {
    // PowerShell likes to prepend a BOM, and the reader panel writes from PowerShell.
    // JSON.parse does not survive one, and the failure looks exactly like "the file
    // was never written".
    return JSON.parse(
      fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""),
    ) as T;
  } catch {
    return undefined;
  }
};

/**
 * What the reader panel writes when it needs audio it cannot produce itself: a speed
 * the user picked from the chips, or a word that sits before the audio it is holding.
 * `seq` only ever grows — the worker adopts the number it finds at startup without
 * acting on it, so a request left on disk never replays into the next reading.
 */
export type Request =
  | { seq: number; kind: "rate"; rate: number }
  | { seq: number; kind: "seek"; pos: number };

export const readRequest = (): Request | undefined => {
  const raw = readJson<Partial<Request> & { seq?: number }>(requestFile);
  if (!raw || typeof raw.seq !== "number") return undefined;
  if (raw.kind === "rate" && typeof raw.rate === "number" && raw.rate > 0)
    return { seq: raw.seq, kind: "rate", rate: raw.rate };
  if (raw.kind === "seek" && typeof raw.pos === "number" && raw.pos >= 0)
    return { seq: raw.seq, kind: "seek", pos: Math.floor(raw.pos) };
  return undefined;
};

/** The sequence number on disk, whatever shape the payload is in. */
export const readRequestSeq = () =>
  readJson<{ seq?: number }>(requestFile)?.seq ?? 0;

export type Heartbeat = { pid: number; ts: number };

/** The worker also publishes which credentials it is holding, as a fingerprint. */
export type WorkerBeat = Heartbeat & { stamp: string };

const heartbeatToleranceMs = 3000;

/** True while a process is publishing a fresh heartbeat into `file`. */
export const readLiveHeartbeat = <T extends Heartbeat>(
  file: string,
): T | undefined => {
  const beat = readJson<T>(file);
  if (!beat) return undefined;
  if (Date.now() - beat.ts > heartbeatToleranceMs) return undefined;
  try {
    process.kill(beat.pid, 0);
  } catch {
    return undefined;
  }
  return beat;
};

/** The reader only counts as alive if the process exists *and* the heartbeat is fresh. */
export const readLiveStatus = (): Status | undefined => {
  const status = readJson<Status>(statusFile);
  if (!status) return undefined;
  if (Date.now() - status.ts > heartbeatToleranceMs) return undefined;
  try {
    process.kill(status.pid, 0);
  } catch {
    return undefined;
  }
  return status;
};

export const isSpeaking = (status: Status | undefined): status is Status =>
  !!status &&
  (status.state === "playing" ||
    status.state === "paused" ||
    status.state === "starting");

export const sendControl = (cmd: Control["cmd"]) => {
  const previous = readJson<Control>(controlFile);
  writeJsonAtomic(controlFile, { seq: (previous?.seq ?? 0) + 1, cmd });
};

/** Drop wav files from previous readings; the reader holds a lock on the one in use. */
export const pruneAudio = (keep: string[]) => {
  let entries: string[];
  try {
    entries = fs.readdirSync(audioDir);
  } catch {
    return;
  }
  const keepSet = new Set(keep.map((f) => path.basename(f)));
  for (const entry of entries) {
    if (keepSet.has(entry)) continue;
    try {
      fs.unlinkSync(path.join(audioDir, entry));
    } catch {
      // The reader still has it open. It will be collected on the next run.
    }
  }
};
