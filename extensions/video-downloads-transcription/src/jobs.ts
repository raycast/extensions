import { spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import {
  MediaFormat,
  Settings,
  VideoRef,
  downloadImages,
  downloadMedia,
} from "./core";
import {
  PlaylistDownload,
  PlaylistMediaDownload,
  downloadPlaylistMedia,
  downloadPlaylistSubtitles,
} from "./playlists";
import { downloadEncoder, downloadModel } from "./models";
import { installWithHomebrew } from "./setup";
import {
  TranscriptionOptions,
  transcribeFile,
  transcribeVideo,
} from "./whisper";

export type JobSpec =
  | { kind: "file"; path: string; options: TranscriptionOptions }
  | {
      kind: "video";
      video: VideoRef;
      options: TranscriptionOptions;
    }
  | ({ kind: "playlist" } & PlaylistDownload)
  | ({ kind: "playlist-media" } & PlaylistMediaDownload)
  | { kind: "media"; video: VideoRef; format: MediaFormat }
  | { kind: "images"; video: VideoRef }
  /** A whisper model from the catalog, downloaded into `folder`. */
  | { kind: "model"; name: string; folder: string }
  /** The Core ML encoder for the model at `path`. */
  | { kind: "encoder"; path: string }
  | { kind: "install"; formulas: string[] };

export type JobStatus = "queued" | "running" | "done" | "failed" | "canceled";

export type Job = {
  id: string;
  title: string;
  spec: JobSpec;
  settings: Settings;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  progress?: string;
  percent?: number;
  outputs?: string[];
  /** Playlist videos that were skipped or failed, and why. */
  skipped?: { title: string; reason: string }[];
  /** The folder a playlist's downloads are saved in. */
  folder?: string;
  error?: string;
  /** The process running the job. */
  worker?: number;
};

/** A download of every video in a playlist or channel. */
export function isPlaylist(job: Job): boolean {
  return job.spec.kind === "playlist" || job.spec.kind === "playlist-media";
}

export function isActive(job: Job): boolean {
  return job.status === "queued" || job.status === "running";
}

export function queueFolder(settings: Settings): string {
  if (!settings.supportPath)
    throw new Error("The extension's support folder is not available.");
  return join(settings.supportPath, "queue");
}

function jobFile(folder: string, id: string): string {
  return join(folder, `${id}.json`);
}

function cancelFile(folder: string, id: string): string {
  return join(folder, `${id}.cancel`);
}

/** Replaces a file in one step, so other processes never read half of it. */
function writeAtomic(path: string, contents: string) {
  const partial = `${path}.${process.pid}.tmp`;
  writeFileSync(partial, contents);
  renameSync(partial, path);
}

function saveJob(folder: string, job: Job) {
  writeAtomic(jobFile(folder, job.id), JSON.stringify(job));
}

function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

function lockFile(folder: string): string {
  return join(folder, "worker.lock");
}

/** The process ID of the running queue worker, if there is one. */
export function workerProcess(folder: string): number | undefined {
  try {
    const pid = Number(readFileSync(lockFile(folder), "utf8"));
    return pid && processAlive(pid) ? pid : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Jobs in the order they are shown: running first, then queued jobs in the
 * order they run, then finished jobs with the newest first. Jobs whose worker
 * stopped without finishing them are reported as failed.
 */
export function readJobs(folder: string): Job[] {
  let files: string[];
  try {
    files = readdirSync(folder).filter((file) => file.endsWith(".json"));
  } catch {
    return [];
  }
  const jobs: Job[] = [];
  for (const file of files) {
    try {
      const job = JSON.parse(readFileSync(join(folder, file), "utf8")) as Job;
      if (
        job.status === "running" &&
        (!job.worker || !processAlive(job.worker))
      )
        Object.assign(job, {
          status: "failed",
          error: "Stopped before finishing",
        });
      else if (
        job.status === "queued" &&
        existsSync(cancelFile(folder, job.id))
      )
        job.status = "canceled";
      jobs.push(job);
    } catch {
      /* removed or unreadable */
    }
  }
  const rank = { running: 0, queued: 1, done: 2, failed: 2, canceled: 2 };
  return jobs.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      (isActive(a)
        ? a.createdAt - b.createdAt
        : (b.finishedAt ?? b.createdAt) - (a.finishedAt ?? a.createdAt)),
  );
}

/** Adds jobs to the queue and makes sure the worker is running. */
export function enqueue(
  settings: Settings,
  jobs: { title: string; spec: JobSpec }[],
): Job[] {
  const folder = queueFolder(settings);
  mkdirSync(folder, { recursive: true });
  const now = Date.now();
  const added = jobs.map(({ title, spec }, index) => {
    const job: Job = {
      id: `${(now + index).toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      spec,
      settings,
      status: "queued",
      createdAt: now + index,
    };
    saveJob(folder, job);
    return job;
  });
  startWorker(folder);
  return added;
}

/** Asks the worker to stop a job. Queued jobs are skipped when their turn comes. */
export function cancelJob(folder: string, job: Job) {
  if (!isActive(job)) return;
  writeFileSync(cancelFile(folder, job.id), "");
  if (!workerProcess(folder)) finishWithoutWorker(folder, job.id);
}

function finishWithoutWorker(folder: string, id: string) {
  try {
    const job = JSON.parse(readFileSync(jobFile(folder, id), "utf8")) as Job;
    if (!isActive(job)) return;
    saveJob(folder, {
      ...job,
      status: "canceled",
      progress: undefined,
      finishedAt: Date.now(),
    });
    rmSync(cancelFile(folder, id), { force: true });
  } catch {
    /* already removed */
  }
}

/** Removes a finished job from the list. The files it saved are kept. */
export function removeJob(folder: string, job: Job) {
  if (isActive(job) && workerProcess(folder)) return;
  rmSync(jobFile(folder, job.id), { force: true });
  rmSync(cancelFile(folder, job.id), { force: true });
}

export function retryJob(settings: Settings, job: Job): Job[] {
  return enqueue(settings, [{ title: job.title, spec: job.spec }]);
}

/**
 * The worker runs in its own Node process, so jobs keep running after Raycast
 * closes the command. It loads this same bundle; Raycast's modules are
 * replaced with empty objects because the worker never renders anything.
 */
const launcher = `
const Module = require("node:module");
const load = Module._load;
Module._load = function (request, ...rest) {
  if (request === "@raycast/api" || request === "react" || request.startsWith("react/")) return {};
  return load.call(this, request, ...rest);
};
require(process.argv[1]).runQueueWorker(process.argv[2]);
`;

function nodeBinary(): string {
  if (/^node(\.exe)?$/i.test(basename(process.execPath)))
    return process.execPath;
  const runtime = join(
    homedir(),
    "Library/Application Support/com.raycast.macos/NodeJS/runtime",
  );
  try {
    for (const version of readdirSync(runtime).sort().reverse()) {
      const node = join(runtime, version, "bin", "node");
      if (existsSync(node)) return node;
    }
  } catch {
    /* not installed there */
  }
  return (
    ["/opt/homebrew/bin/node", "/usr/local/bin/node"].find(existsSync) ?? "node"
  );
}

/** Starts the queue worker unless it is already running. */
export function startWorker(folder: string, bundle = __filename) {
  if (workerProcess(folder)) return;
  mkdirSync(folder, { recursive: true });
  const log = join(folder, "worker.log");
  try {
    if (statSync(log).size > 1_000_000) rmSync(log);
  } catch {
    /* no log yet */
  }
  const output = openSync(log, "a");
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  const child = spawn(nodeBinary(), ["-e", launcher, bundle, folder], {
    detached: true,
    stdio: ["ignore", output, output],
    env,
  });
  child.on("error", () => undefined);
  child.unref();
  closeSync(output);
}

function acquireLock(folder: string): boolean {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      writeFileSync(lockFile(folder), String(process.pid), { flag: "wx" });
      return true;
    } catch {
      if (workerProcess(folder)) return false;
      rmSync(lockFile(folder), { force: true });
    }
  }
  return false;
}

function releaseLock(folder: string) {
  try {
    if (Number(readFileSync(lockFile(folder), "utf8")) === process.pid)
      rmSync(lockFile(folder));
  } catch {
    /* already released */
  }
}

/**
 * How many jobs of a kind run at once. Transcriptions share the GPU and run
 * one at a time, playlists one at a time so sites don't limit them, and a few
 * single downloads run beside them.
 */
const laneLimits = { whisper: 1, playlist: 1, download: 3, homebrew: 1 };

function lane(job: Job): keyof typeof laneLimits {
  switch (job.spec.kind) {
    case "file":
    case "video":
      return "whisper";
    case "playlist":
    case "playlist-media":
      return "playlist";
    case "install":
      return "homebrew";
    default:
      return "download";
  }
}

type JobResult = Pick<Job, "outputs" | "skipped" | "folder">;

async function perform(
  spec: JobSpec,
  settings: Settings,
  onProgress: (message: string, percent?: number) => void,
  signal: AbortSignal,
): Promise<JobResult> {
  switch (spec.kind) {
    case "file":
      return {
        outputs: [
          await transcribeFile(
            spec.path,
            spec.options,
            settings,
            onProgress,
            signal,
          ),
        ],
      };
    case "video":
      return await transcribeVideo(
        spec.video,
        spec.options,
        settings,
        onProgress,
        signal,
      );
    case "playlist":
      return await downloadPlaylistSubtitles(
        spec,
        settings,
        onProgress,
        signal,
      );
    case "playlist-media":
      return await downloadPlaylistMedia(spec, settings, onProgress, signal);
    case "model":
      return {
        outputs: [
          await downloadModel(spec.name, spec.folder, onProgress, signal),
        ],
      };
    case "encoder":
      return {
        outputs: [await downloadEncoder(spec.path, onProgress, signal)],
      };
    case "install":
      await installWithHomebrew(spec.formulas, onProgress, signal);
      return {};
    case "images":
      return {
        outputs: await downloadImages(spec.video, settings, onProgress, signal),
      };
    case "media":
      return {
        outputs: await downloadMedia(
          spec.video,
          spec.format,
          settings,
          onProgress,
          signal,
        ),
      };
  }
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function runJob(folder: string, queued: Job): Promise<Job> {
  let job: Job = {
    ...queued,
    status: "running",
    startedAt: Date.now(),
    worker: process.pid,
    progress: "Starting…",
  };
  saveJob(folder, job);
  const controller = new AbortController();
  const watch = setInterval(() => {
    if (existsSync(cancelFile(folder, job.id))) controller.abort();
  }, 500);
  let saved = 0;
  const onProgress = (message: string, percent?: number) => {
    const match = percent === undefined ? /(\d+)%/.exec(message) : null;
    job = {
      ...job,
      progress: message,
      percent: match ? Number(match[1]) : percent,
    };
    if (Date.now() - saved > 400) {
      saved = Date.now();
      saveJob(folder, job);
    }
  };
  try {
    const result = await perform(
      job.spec,
      job.settings,
      onProgress,
      controller.signal,
    );
    // Jobs that skip items, like playlists, fail when they saved nothing.
    const failed = result.skipped !== undefined && !result.outputs?.length;
    job = {
      ...job,
      ...result,
      status: failed ? "failed" : "done",
      error: failed
        ? (result.skipped?.[0]?.reason ?? "Nothing was saved")
        : undefined,
    };
  } catch (error) {
    job = controller.signal.aborted
      ? {
          ...job,
          ...(error as { partial?: Partial<Job> }).partial,
          status: "canceled",
        }
      : {
          ...job,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        };
  } finally {
    clearInterval(watch);
  }
  job = {
    ...job,
    progress: undefined,
    percent: undefined,
    finishedAt: Date.now(),
  };
  saveJob(folder, job);
  rmSync(cancelFile(folder, job.id), { force: true });
  return job;
}

function notify(title: string, message: string) {
  const child = spawn(
    "/usr/bin/osascript",
    [
      "-e",
      "on run argv",
      "-e",
      "display notification (item 2 of argv) with title (item 1 of argv)",
      "-e",
      "end run",
      title,
      message,
    ],
    { stdio: "ignore" },
  );
  child.on("error", () => undefined);
}

/** A one-line summary of the jobs a worker finished, for its notification. */
export function queueSummary(jobs: Job[]): string | undefined {
  const count = (value: number, noun: string) =>
    `${value} ${noun}${value === 1 ? "" : "s"}`;
  if (jobs.length === 1 && jobs[0].status === "failed")
    return `${jobs[0].title}: ${jobs[0].error}`;
  const parts: string[] = [];
  const groups: [JobSpec["kind"][], string][] = [
    [["file", "video"], "transcription"],
    [["media", "images"], "download"],
    [["model", "encoder"], "model download"],
  ];
  for (const [kinds, noun] of groups) {
    const group = jobs.filter((job) => kinds.includes(job.spec.kind));
    // A transcribed post with several videos counts each transcript.
    const done = group
      .filter((job) => job.status === "done")
      .reduce(
        (total, job) =>
          total +
          (noun === "transcription"
            ? Math.max(job.outputs?.length ?? 1, 1)
            : 1),
        0,
      );
    const failed = group.filter((job) => job.status === "failed").length;
    if (done && failed)
      parts.push(
        `${done} of ${done + failed} ${noun}s saved, ${failed} failed`,
      );
    else if (done) parts.push(`${count(done, noun)} saved`);
    else if (failed) parts.push(`${count(failed, noun)} failed`);
  }
  for (const job of jobs)
    if (job.spec.kind === "install" && job.status !== "canceled")
      parts.push(
        job.status === "done"
          ? `Installed ${job.spec.formulas.join(", ")}`
          : `${job.title}: ${job.error}`,
      );
  for (const job of jobs) {
    if (!isPlaylist(job) || job.status === "canceled") continue;
    const saved = job.outputs?.length ?? 0;
    const total = saved + (job.skipped?.length ?? 0);
    parts.push(
      job.status === "failed" && !saved
        ? `${job.title}: ${job.error}`
        : job.spec.kind === "playlist-media"
          ? `${job.title}: ${saved} of ${total} videos saved as ${job.spec.format.toUpperCase()}`
          : `${job.title}: subtitles for ${saved} of ${total} videos saved`,
    );
  }
  return parts.length ? parts.join("\n") : undefined;
}

/**
 * Runs queued jobs until none are left, then exits. Only one worker runs at a
 * time; a second one exits right away.
 */
export async function runQueueWorker(folder: string) {
  const finished: Job[] = [];
  while (acquireLock(folder)) {
    const running = new Map<
      string,
      { lane: keyof typeof laneLimits; done: Promise<void> }
    >();
    try {
      for (;;) {
        for (const job of readJobs(folder)) {
          const jobLane = lane(job);
          if (
            job.status !== "queued" ||
            running.has(job.id) ||
            [...running.values()].filter((other) => other.lane === jobLane)
              .length >= laneLimits[jobLane]
          )
            continue;
          running.set(job.id, {
            lane: jobLane,
            done: runJob(folder, job)
              .then(
                (result) => void finished.push(result),
                (error) => console.error(error),
              )
              .finally(() => running.delete(job.id)),
          });
        }
        for (const job of readJobs(folder))
          if (
            job.status === "canceled" &&
            existsSync(cancelFile(folder, job.id))
          )
            finishWithoutWorker(folder, job.id);
        if (!running.size) break;
        await Promise.race([
          sleep(1000),
          ...[...running.values()].map((other) => other.done),
        ]);
      }
    } finally {
      releaseLock(folder);
    }
    // A job added while the lock was being released would otherwise wait.
    if (!readJobs(folder).some((job) => job.status === "queued")) break;
  }
  const summary = queueSummary(finished);
  const settings = finished.find((job) => job.settings)?.settings;
  if (summary && settings?.notifyWhenDone !== false)
    notify("Video Downloads & Transcription", summary);
}
